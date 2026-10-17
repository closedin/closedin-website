// Checks every href/src on the homepage: internal clean URLs must map to a file, external links must not 404.
// Usage: node scripts/check-links.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'case-study-showcase');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i);
let bad = 0;
for (const ref of refs) {
  if (ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:')) continue;
  if (ref.startsWith('/_vercel/') || ref.includes("' +")) continue; // Vercel-injected endpoints and JS string fragments
  if (/^https?:\/\//.test(ref) || ref.startsWith('//')) {
    const url = ref.startsWith('//') ? 'https:' + ref : ref;
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
      let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (link check)' } });
      if (r.status === 405 || r.status === 403) r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (link check)' } });
      clearTimeout(t);
      if (r.status >= 400 && r.status !== 999 && r.status !== 403) { console.log('EXTERNAL', r.status, url); bad++; } else if (r.status === 999 || r.status === 403) console.log('warn  ', r.status, url);
    } catch (e) { console.log('EXTERNAL error', url, e.name); bad++; }
    continue;
  }
  if (ref === 'index') { console.log('LEGACY href="index", use "/"'); bad++; continue; }
  const clean = ref.replace(/^\//, '').split('?')[0];
  const candidates = clean === '' ? ['index.html'] : [clean, clean + '.html', path.join(clean, 'index.html')];
  if (!candidates.some(c => fs.existsSync(path.join(root, c)))) { console.log('MISSING', ref); bad++; }
}
console.log(`links: ${refs.length} checked, ${bad === 0 ? 'PASS' : 'FAIL (' + bad + ')'}`);
process.exit(bad ? 1 : 0);
