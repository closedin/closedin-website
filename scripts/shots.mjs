// Screenshots, console errors, overflow and fallback checks with the local Chrome.
// Usage: node scripts/shots.mjs --url http://localhost:8080/ --out review/2026-10-09 [--reduce] [--no3d]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import puppeteer from 'puppeteer-core';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const url = arg('--url', 'http://localhost:8080/'); const out = arg('--out', 'review/latest');
const reduce = process.argv.includes('--reduce'); const no3d = process.argv.includes('--no3d');
fs.mkdirSync(out, { recursive: true });
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
if (no3d) args.push('--disable-3d-apis');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args });
const allow = [/analytics\.google\.com/, /google-analytics\.com/, /connect\.facebook\.net/, /facebook\.com\/tr/, /snap\.licdn\.com/, /px\.ads\.linkedin\.com/, /leadboxer/, /prppr/, /strds/, /jsapis/, /googletagmanager/, /_vercel/];
const errors = [];
const sizes = [[1440, 900, 'desktop'], [1024, 768, 'tablet'], [390, 844, 'mobile']];
for (const [w, h, name] of sizes) {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(`${name}: pageerror ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !allow.some(r => r.test(m.text()))) errors.push(`${name}: console ${m.text().slice(0, 160)}`); });
  page.on('response', r => { if (r.status() >= 400 && !allow.some(x => x.test(r.url()))) errors.push(`${name}: HTTP ${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => { if (!allow.some(x => x.test(r.url()))) errors.push(`${name}: requestfailed ${r.url()}`); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 800, hasTouch: w < 800 });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('cookieConsent', 'rejected'); } catch (e) {} });
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1800));
  const over = await page.evaluate(() => {
    const wide = [...document.querySelectorAll('body *')].filter(el => !el.closest('.rail__track') && el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(el => el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
    return { diff: document.documentElement.scrollWidth - innerWidth, wide, canvas: !!document.querySelector('.mark canvas'), live: !!document.querySelector('.mark.is-live'), wistia: !!document.querySelector('script[src*="fast.wistia.com/player.js"]') };
  });
  console.log(`${name} ${w}x${h}: overflow ${over.diff}px ${over.wide.length ? JSON.stringify(over.wide) : ''} | 3D canvas: ${over.canvas} live: ${over.live} | wistia loaded before click: ${over.wistia}`);
  await page.screenshot({ path: path.join(out, `${name}-top${reduce ? '-reduce' : ''}${no3d ? '-no3d' : ''}.png`) });
  {
    // scroll through the page so reveals fire and lazy images load, then full page
    await page.evaluate(async () => { const s = document.documentElement.scrollHeight; for (let y = 0; y < s; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await new Promise(r => setTimeout(r, 800));
  }
  if (reduce || no3d) await page.screenshot({ path: path.join(out, `${name}-full${reduce ? '-reduce' : ''}${no3d ? '-no3d' : ''}.png`), fullPage: true });
  if (name === 'desktop' && !reduce && !no3d) {
    // process section with the mark at a few scroll offsets
    const top = await page.evaluate(() => { const el = document.querySelector('.engine, .process'); return el ? el.getBoundingClientRect().top + window.scrollY : 0; });
    for (const off of [-300, 0, 400, 800]) {
      await page.evaluate(y => window.scrollTo(0, y), top + off); await new Promise(r => setTimeout(r, 700));
      await page.screenshot({ path: path.join(out, `process-${off + 300}.png`) });
    }
  }
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'errors.txt'), errors.join('\n'));
console.log(errors.length ? `ERRORS (${errors.length}):\n` + errors.join('\n') : 'console: PASS (no errors)');
process.exit(errors.length ? 1 : 0);
