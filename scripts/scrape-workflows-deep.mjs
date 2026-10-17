// Deep scrape of workflows.io: CSSOM rules, DOM outline with computed styles, per-section screenshots, hover states.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import puppeteer from 'puppeteer-core';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'research/reference-sites/workflows/deep'); fs.mkdirSync(out, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--disable-blink-features=AutomationControlled', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setUserAgent(UA); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto('https://www.workflows.io/', { waitUntil: 'networkidle2', timeout: 90000 }); await new Promise(r => setTimeout(r, 3000));
await page.evaluate(() => { for (const b of document.querySelectorAll('button')) { const t = (b.textContent || '').trim().toLowerCase(); if (/^(accept|accept all|allow all|agree|ok|got it|allow)/.test(t)) { try { b.click(); } catch (e) {} } } });
// 1) CSSOM
const css = await page.evaluate(() => { const out = []; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) out.push(r.cssText); } catch (e) { out.push('/* blocked: ' + sh.href + ' */'); } } return out.join('\n'); });
fs.writeFileSync(path.join(out, 'cssom.css'), css); console.log('cssom bytes', css.length);
// scroll through once for lazy content and reveals
await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 450) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 1000)); });
// 2) sections + outline
const data = await page.evaluate(() => {
  const cs = (el) => getComputedStyle(el);
  const sig = (el) => { const s = cs(el); return { display: s.display, pos: s.position, grid: s.gridTemplateColumns !== 'none' ? s.gridTemplateColumns.slice(0, 80) : undefined, flex: s.display.includes('flex') ? `${s.flexDirection} ${s.justifyContent} ${s.alignItems}` : undefined, gap: s.gap !== 'normal' ? s.gap : undefined, pad: s.padding !== '0px' ? s.padding : undefined, bg: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : undefined, bgi: s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 90) : undefined, radius: s.borderRadius !== '0px' ? s.borderRadius : undefined, shadow: s.boxShadow !== 'none' ? s.boxShadow.slice(0, 120) : undefined, border: s.borderTopWidth !== '0px' ? `${s.borderTopWidth} ${s.borderTopColor}` : undefined, color: s.color, fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing !== 'normal' ? s.letterSpacing : undefined, ff: s.fontFamily.split(',')[0], op: s.opacity !== '1' ? s.opacity : undefined, tr: s.transform !== 'none' ? s.transform.slice(0, 60) : undefined, filter: s.filter !== 'none' ? s.filter.slice(0, 60) : undefined }; };
  const rootEl = document.querySelector('.scroll-layout') || document.body;
  const nodes = []; let count = 0;
  const walk = (el, depth, parentId) => {
    if (count > 3000) return;
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return;
    const id = count++;
    const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ').slice(0, 100);
    const node = { id, p: parentId, d: depth, tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 3).join('.'), x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), text: text || undefined, href: el.getAttribute('href') || undefined, src: el.tagName === 'IMG' ? (el.currentSrc || el.src).slice(0, 120) : undefined, alt: el.getAttribute('alt') || undefined, ...sig(el) };
    Object.keys(node).forEach(k => node[k] === undefined && delete node[k]);
    nodes.push(node);
    if (depth < 9 && el.tagName !== 'SVG' && el.tagName !== 'svg') for (const c of el.children) walk(c, depth + 1, id);
  };
  walk(rootEl, 0, -1);
  const sections = [...rootEl.children].map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().split(' ').slice(0, 2).join('.'), top: Math.round(r.top + scrollY), h: Math.round(r.height), bg: cs(el).backgroundColor, heading: (el.querySelector('h1,h2,h3')?.textContent || '').trim().slice(0, 80) }; });
  // nav link innerHTML (letter-split hover?)
  const navLink = document.querySelector('header a, nav a'); const btn = [...document.querySelectorAll('button, a')].find(e => /request call/i.test(e.textContent || ''));
  return { sections, nodes, navLinkHTML: navLink ? navLink.outerHTML.slice(0, 600) : null, requestBtnHTML: btn ? btn.outerHTML.slice(0, 800) : null, docH: document.documentElement.scrollHeight };
});
fs.writeFileSync(path.join(out, 'outline.json'), JSON.stringify(data));
console.log('nodes', data.nodes.length, 'sections', data.sections.length, 'docH', data.docH);
console.log(JSON.stringify(data.sections, null, 0));
console.log('navLink:', data.navLinkHTML); console.log('requestBtn:', data.requestBtnHTML);
// 3) per-viewport screenshots down the page (artifact-free: native scroll + wait)
let i = 0; for (let y = 0; y < data.docH; y += 850) { await page.evaluate(yy => window.scrollTo(0, yy), y); await new Promise(r => setTimeout(r, 1400)); await page.screenshot({ path: path.join(out, `view-${String(i).padStart(2, '0')}-y${y}.png`) }); i++; }
console.log('views', i);
// 4) hover states
await page.evaluate(() => window.scrollTo(0, 0)); await new Promise(r => setTimeout(r, 800));
const hoverTargets = await page.evaluate(() => { const pick = (re) => [...document.querySelectorAll('button, a')].find(e => re.test((e.textContent || '').trim())); const sel = (el) => { if (!el) return null; el.setAttribute('data-probe', '1'); return '[data-probe="1"]'; }; const out = {}; const b = pick(/^Request Call/i); if (b) { b.setAttribute('data-probe-btn', '1'); out.btn = '[data-probe-btn="1"]'; } const n = [...document.querySelectorAll('header a, nav a')].find(e => /Services/i.test(e.textContent)); if (n) { n.setAttribute('data-probe-nav', '1'); out.nav = '[data-probe-nav="1"]'; } const chip = [...document.querySelectorAll('a, button, div')].find(e => (e.textContent || '').trim() === 'Outbound'); if (chip) { chip.setAttribute('data-probe-chip', '1'); out.chip = '[data-probe-chip="1"]'; } const lm = pick(/^Learn more/i); if (lm) { lm.setAttribute('data-probe-lm', '1'); out.lm = '[data-probe-lm="1"]'; } return out; });
const probe = async (sel) => { const before = await page.$eval(sel, el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, tr: s.transform, html: el.innerHTML.slice(0, 300) }; }); await page.hover(sel); await new Promise(r => setTimeout(r, 700)); const after = await page.$eval(sel, el => { const s = getComputedStyle(el); const kid = el.querySelector('span, div'); const ks = kid ? getComputedStyle(kid) : null; return { bg: s.backgroundColor, color: s.color, tr: s.transform, kidTr: ks ? ks.transform : null, kidColor: ks ? ks.color : null, html: el.innerHTML.slice(0, 300) }; }); return { before, after }; };
for (const [k, sel] of Object.entries(hoverTargets)) { try { const r = await probe(sel); console.log(`hover ${k}:`, JSON.stringify(r).slice(0, 900)); if (k === 'btn') { await page.screenshot({ path: path.join(out, 'hover-request-call.png'), clip: { x: 300, y: 380, width: 840, height: 160 } }); } } catch (e) { console.log('hover', k, 'failed', e.message.slice(0, 80)); } }
// 5) mouse dots: two hero shots with the mouse at different places
await page.mouse.move(300, 300); await new Promise(r => setTimeout(r, 900)); await page.screenshot({ path: path.join(out, 'hero-mouse-left.png'), clip: { x: 0, y: 60, width: 1440, height: 640 } });
await page.mouse.move(1100, 500); await new Promise(r => setTimeout(r, 900)); await page.screenshot({ path: path.join(out, 'hero-mouse-right.png'), clip: { x: 0, y: 60, width: 1440, height: 640 } });
await browser.close(); console.log('done');
