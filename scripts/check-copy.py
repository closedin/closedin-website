#!/usr/bin/env python3
"""Copy hygiene for the homepage: no emoji, no em/en dashes, no 'open rate', no 'plynq', no 'Closed:in', no framer-hosted images,
no Wistia player.js in the initial HTML, no star or arrow glyphs. Scripts and JSON-LD are excluded from the glyph checks but
included in the 'open rate' / 'plynq' checks. Exit 1 on any hit."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / "case-study-showcase"
files = [root / "index.html", root / "assets/css/site.css", root / "assets/css/home.css", root / "assets/js/site.js", root / "assets/js/mark-3d.js"]
hits = 0
emoji = re.compile(r"[\U0001F000-\U0001FAFF☀-➿⭐✅⬆↔-⇿]")
for f in files:
    text = f.read_text(encoding="utf-8")
    body = re.sub(r"<!--.*?-->", "", re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.S), flags=re.S) if f.suffix == ".html" else text
    for i, line in enumerate(body.splitlines(), 1):
        for pat, label in ((emoji, "emoji/pictograph"), (re.compile("—"), "em dash"), (re.compile("–"), "en dash"), (re.compile("★|→"), "star/arrow glyph")):
            if pat.search(line):
                print(f"{f.name}:{i}: {label}: {line.strip()[:120]}"); hits += 1
    for pat, label in ((re.compile(r"open rate", re.I), "open rate"), (re.compile(r"plynq", re.I), "plynq"), (re.compile(r"Closed:in"), "capitalised brand"),
                       (re.compile(r"framerusercontent"), "framer-hosted image"), (re.compile(r"fast\.wistia\.com/player\.js"), "wistia player in initial html")):
        if f.suffix == ".html" or label in ("open rate", "plynq"):
            for i, line in enumerate(text.splitlines(), 1):
                if pat.search(line) and not (label == "wistia player in initial html" and f.suffix == ".js"):
                    print(f"{f.name}:{i}: {label}: {line.strip()[:120]}"); hits += 1
print("copy check:", "PASS" if hits == 0 else f"FAIL ({hits})")
sys.exit(1 if hits else 0)
