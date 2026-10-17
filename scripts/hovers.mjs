// Hover-state captures (beam pills, service visuals, vault fan, cursor ring) with the local Chrome.
// Usage: node hovers.mjs --url http://localhost:8080/ --out ../review/<date>/hovers
import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer-core';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const url = arg('--url', 'http://localhost:8080/'), out = arg('--out', 'hovers');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('cookieConsent', 'rejected'); } catch (e) {} });
const errors = []; p.on('pageerror', e => errors.push('pageerror ' + e.message));
await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); await new Promise(r => setTimeout(r, 1500));
const targets = [['vsl', '.hero__vsl', .55, .45], ['btn', '.hero .btn-accent', .7, .6], ['story', '.story:nth-child(2)', .5, .35], ['rcard', '.rcard:nth-child(2)', .6, .5], ['svc1', '.svc-card:nth-child(1)', .5, .8], ['svc2', '.svc-card:nth-child(2)', .5, .8], ['svc3', '.svc-card:nth-child(3)', .5, .8], ['svc4', '.svc-card:nth-child(4)', .5, .8], ['vault-l', '.learn-card--l', .5, .5], ['vault-c', '.learn-card--c', .5, .5], ['vault-r', '.learn-card--r', .5, .5], ['engine-btn', '.flow .btn-accent', .5, .5]];
for (const [name, sel, fx, fy] of targets) {
  const ok = await p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - Math.max(80, (innerHeight - r.height) / 2)); return true; }, sel);
  if (!ok) { console.log('missing', sel); continue; }
  await new Promise(r => setTimeout(r, 1200));
  const box = await (await p.$(sel)).boundingBox(); if (!box) continue;
  await p.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 14 }); await new Promise(r => setTimeout(r, 1300));
  await p.screenshot({ path: path.join(out, name + '.png') });
}
console.log('hovers done, errors', errors.length); errors.forEach(e => console.log('  ', e));
await b.close();
