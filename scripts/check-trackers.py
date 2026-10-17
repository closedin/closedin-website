#!/usr/bin/env python3
"""Byte parity of the tracker, JSON-LD and cookie blocks between main and the working copy (or a live URL).
Usage: python3 scripts/check-trackers.py [--url https://www.closedin.io/]"""
import subprocess, sys, pathlib, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
def block(text, start, end, inclusive_end=True):
    i = text.find(start)
    if i < 0: return None
    j = text.find(end, i)
    if j < 0: return None
    return text[i: j + (len(end) if inclusive_end else 0)]
BLOCKS = [
    ("head trackers", '<script defer src="/_vercel/insights/script.js"></script>', "gtag('config', 'G-WK7J5NHB0C');\n    </script>"),
    ("json-ld graph", '<script type="application/ld+json">\n    {\n      "@context": "https://schema.org",\n      "@graph"', "</script>"),
    ("prospect pro + stairoids", "<!-- Prospect Pro", "jq_950354e1.js'></script>"),
    ("cookie banner + claydar", '<div class="cookie-banner" id="cookie-banner">', "})();\n</script>"),
    ("leadboxer + subscribe", "<!-- Leadboxer", '<script defer src="/subscribe-form.js"></script>'),
]
main = subprocess.run(["git", "-C", str(root), "show", "main:case-study-showcase/index.html"], capture_output=True, text=True, check=True).stdout
if len(sys.argv) > 2 and sys.argv[1] == "--url":
    new = urllib.request.urlopen(sys.argv[2], timeout=20).read().decode("utf-8")
else:
    new = (root / "case-study-showcase/index.html").read_text(encoding="utf-8")
fails = 0
for name, s, e in BLOCKS:
    a, b = block(main, s, e), block(new, s, e)
    ok = a is not None and a == b
    print(f"{'PASS' if ok else 'FAIL'}  {name}  ({len(a or '')} bytes in main, {len(b or '')} in new)")
    if not ok:
        fails += 1
        if a and b:
            import difflib
            for line in list(difflib.unified_diff(a.splitlines(), b.splitlines(), "main", "new", lineterm=""))[:40]: print("   ", line)
sys.exit(1 if fails else 0)
