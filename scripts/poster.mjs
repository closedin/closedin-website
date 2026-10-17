// Renders the 3D mark poster (transparent PNG) and the OG image with headless Chrome + SwiftShader.
// Usage: node scripts/poster.mjs   (expects `npx serve -l 8081 ..` serving the repo root)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import puppeteer from 'puppeteer-core';
const base = process.env.BASE || 'http://localhost:8081';
const site = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'case-study-showcase');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror', e.message)); page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await page.setViewport({ width: 1600, height: 1600, deviceScaleFactor: 1 });
await page.goto(`${base}/scripts/poster/poster.html?size=1600`, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.title === 'ready', { timeout: 30000 });
const canvas = await page.$('canvas');
await canvas.screenshot({ path: path.join(site, 'assets/img/mark-poster.png'), omitBackground: true });
console.log('mark-poster.png written');
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(`${base}/scripts/poster/og.html`, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: path.join(site, 'assets/img/og-home.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log('og-home.png written');
await browser.close();
