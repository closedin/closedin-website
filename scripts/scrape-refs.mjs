// Scrapes reference sites with the local Chrome: rendered HTML, stylesheets, computed type scale, section outline, screenshots.
// Usage: node scripts/scrape-refs.mjs  -> research/reference-sites/<slug>/
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'research/reference-sites');
const SITES = [
  ['dylanbrouwer', 'https://www.dylanbrouwer.design/'], ['dennissnellenberg', 'https://dennissnellenberg.com/'], ['workflows', 'https://www.workflows.io/'],
  ['origami', 'https://origami.chat/'], ['anthropic', 'https://www.anthropic.com/'], ['apple', 'https://www.apple.com/'], ['dapper', 'https://www.dapper.agency/']
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--disable-blink-features=AutomationControlled', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [slug, url] of SITES) {
  const dir = path.join(out, slug); fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const cssUrls = new Set();
  page.on('response', r => { const ct = r.headers()['content-type'] || ''; if (ct.includes('text/css')) cssUrls.add(r.url()); });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await new Promise(r => setTimeout(r, 2500));
    // dismiss obvious cookie banners
    await page.evaluate(() => { for (const b of document.querySelectorAll('button')) { const t = (b.textContent || '').trim().toLowerCase(); if (/^(accept|accept all|allow all|agree|ok|got it|accepteren|i agree|allow)/.test(t)) { try { b.click(); } catch (e) {} } } });
    // scroll through for lazy content and scroll-triggered reveals
    await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } await new Promise(r => setTimeout(r, 800)); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 1200)); });
    const data = await page.evaluate(() => {
      const cs = el => el ? getComputedStyle(el) : null;
      const pick = (sel) => { const el = document.querySelector(sel); const s = cs(el); if (!s) return null; return { text: (el.textContent || '').trim().slice(0, 80), fontFamily: s.fontFamily.slice(0, 60), fontSize: s.fontSize, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, lineHeight: s.lineHeight, color: s.color, textTransform: s.textTransform }; };
      const fonts = [...new Set([...document.fonts].map(f => `${f.family} ${f.weight} ${f.style}`))].slice(0, 30);
      const body = cs(document.body);
      const rootVars = []; try { for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) { if (rule.selectorText === ':root' || rule.selectorText === 'html') { for (const p of rule.style) if (p.startsWith('--')) rootVars.push(`${p}: ${rule.style.getPropertyValue(p).trim()}`); } } } catch (e) {} } } catch (e) {}
      // top-level blocks: direct children of body/main with height > 200
      const blocks = [];
      const walk = (el, depth) => { for (const c of el.children) { const r = c.getBoundingClientRect(); const h = Math.round(c.offsetHeight || r.height); if (h >= 200 && depth < 3) { const st = cs(c); const bg = st.backgroundColor; const kids = [...c.children].filter(k => (k.offsetHeight || 0) >= 200); if (kids.length > 1 && h > 1600) walk(c, depth + 1); else blocks.push({ tag: c.tagName.toLowerCase(), cls: (c.className && typeof c.className === 'string') ? c.className.split(' ').slice(0, 3).join('.') : '', id: c.id || '', h, bg, top: Math.round(r.top + scrollY), heading: (c.querySelector('h1,h2,h3')?.textContent || '').trim().slice(0, 90) }); } else if (depth < 3 && c.children.length && h < 200 && c.scrollHeight > 1000) walk(c, depth + 1); } };
      walk(document.body, 0);
      const imgs = [...document.images].length, videos = document.querySelectorAll('video').length, canvases = document.querySelectorAll('canvas').length, svgs = document.querySelectorAll('svg').length;
      const scripts = [...document.scripts].map(s => s.src).filter(Boolean).slice(0, 40);
      return { title: document.title, fonts, body: { fontFamily: body.fontFamily.slice(0, 80), fontSize: body.fontSize, lineHeight: body.lineHeight, color: body.color, background: body.backgroundColor }, h1: pick('h1'), h2: pick('h2'), h3: pick('h3'), p: pick('main p, p'), nav: pick('nav a, header a'), button: pick('a[class*=btn], button, a[class*=button]'), rootVars: rootVars.slice(0, 120), blocks, counts: { imgs, videos, canvases, svgs }, scripts, docHeight: document.documentElement.scrollHeight };
    });
    const html = await page.content();
    fs.writeFileSync(path.join(dir, 'rendered.html'), html);
    fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ url, cssUrls: [...cssUrls], ...data }, null, 2));
    await page.screenshot({ path: path.join(dir, 'desktop-top.png') });
    await page.screenshot({ path: path.join(dir, 'desktop-full.png'), fullPage: true });
    // download stylesheets (first 6)
    let i = 0; for (const u of [...cssUrls].slice(0, 6)) { try { const r = await fetch(u, { headers: { 'user-agent': UA } }); if (r.ok) fs.writeFileSync(path.join(dir, `style-${i++}.css`), await r.text()); } catch (e) {} }
    // mobile top
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: 'networkidle2', timeout: 90000 }); await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(dir, 'mobile-top.png') });
    console.log(`${slug}: ok, ${data.blocks.length} blocks, ${data.docHeight}px tall, ${cssUrls.size} css, fonts: ${data.fonts.slice(0, 4).join(' | ')}`);
  } catch (e) { console.log(`${slug}: FAILED ${e.message.slice(0, 120)}`); }
  await page.close();
}
await browser.close();
