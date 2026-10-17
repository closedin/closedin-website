// Viewport-by-viewport screenshots of a page (for side-by-side comparison with the reference scrape).
// Usage: node views.mjs --url http://localhost:8080/ --out ../review/2026-10-17/views [--w 1440] [--h 900]
import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer-core';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const url = arg('--url', 'http://localhost:8080/'), out = arg('--out', 'views'), W = +arg('--w', 1440), H = +arg('--h', 900);
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: W < 800, hasTouch: W < 800 });
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('cookieConsent', 'rejected'); } catch (e) {} });
const errors = []; p.on('pageerror', e => errors.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console ' + m.text().slice(0, 160)); });
await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); await new Promise(r => setTimeout(r, 1500));
await p.mouse.move(W * 0.7, H * 0.4);
const docH = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0; for (let y = 0; y < docH; y += H - 50) { await p.evaluate(yy => window.scrollTo(0, yy), y); await new Promise(r => setTimeout(r, 1300)); await p.screenshot({ path: path.join(out, `v-${String(i).padStart(2, '0')}-y${y}.png`) }); i++; }
console.log(`${W}x${H}: ${i} views, doc ${docH}px, errors ${errors.length}`); errors.forEach(e => console.log('  ', e));
await b.close();
