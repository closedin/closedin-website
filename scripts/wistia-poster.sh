#!/usr/bin/env bash
# Usage: scripts/wistia-poster.sh <mediaId> [portrait]
# Downloads the Wistia thumbnail as a local webp poster and prints a ready-to-paste story card + VideoObject snippet.
set -euo pipefail
ID="${1:?media id required}"
ORIENT="${2:-landscape}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)/case-study-showcase"
OUT="$ROOT/assets/img/video"
mkdir -p "$OUT"
JSON=$(curl -sfL "https://fast.wistia.com/oembed?url=https%3A%2F%2Fhome.wistia.com%2Fmedias%2F${ID}&format=json")
TITLE=$(python3 -c 'import sys,json; print(json.load(sys.stdin)["title"])' <<<"$JSON")
DUR=$(python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("duration") or 0)' <<<"$JSON")
THUMB=$(python3 -c 'import sys,json; print(json.load(sys.stdin)["thumbnail_url"].split("?")[0])' <<<"$JSON")
if [ "$ORIENT" = "portrait" ]; then SIZE="540x960"; ASPECT="9/16"; W=540; H=960; else SIZE="960x540"; ASPECT="16/9"; W=960; H=540; fi
curl -sfL -o "$OUT/${ID}.webp" "${THUMB%.jpg}.webp?image_crop_resized=${SIZE}"
MM=$(python3 -c "import math; d=float('$DUR'); print(f'{int(d//60)}:{int(round(d%60)):02d}')")
ISO=$(python3 -c "d=float('$DUR'); m=int(d//60); s=int(round(d%60)); print(f'PT{m}M{s}S')")
echo "Saved $OUT/${ID}.webp ($SIZE), title: $TITLE, duration: $MM"
cat <<HTML

<!-- paste inside .rail__track -->
<article class="story" data-wistia-id="$ID" data-aspect="$ASPECT" data-duration="$MM" data-reveal itemscope itemtype="https://schema.org/Review">
  <button class="story__poster" type="button">
    <span class="sr-only">Play video: NAME, COMPANY, </span>
    <img src="/assets/img/video/${ID}.webp" width="$W" height="$H" alt="" loading="lazy" decoding="async">
    <span class="story__play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
    <span class="story__duration">$MM</span>
  </button>
  <div class="story__top"><span class="story__avatar" aria-hidden="true">NC</span><img class="story__logo" src="wall/COMPANY.png" alt="COMPANY" height="20"></div>
  <blockquote class="story__quote" itemprop="reviewBody">QUOTE</blockquote>
  <footer class="story__meta">
    <span itemprop="author" itemscope itemtype="https://schema.org/Person"><b itemprop="name">NAME</b> <span itemprop="jobTitle">ROLE, COMPANY</span></span>
    <span class="story__outcome">ONE-LINE OUTCOME</span>
  </footer>
  <span itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating" hidden><meta itemprop="ratingValue" content="5"><meta itemprop="bestRating" content="5"></span>
  <span itemprop="itemReviewed" itemscope itemtype="https://schema.org/Organization" hidden><meta itemprop="name" content="closed:in"></span>
</article>

<!-- paste into the ld-video ItemList -->
{ "@type": "VideoObject", "position": N, "name": "$TITLE", "description": "ONE-LINE OUTCOME.",
  "thumbnailUrl": ["https://www.closedin.io/assets/img/video/${ID}.webp"], "uploadDate": "YYYY-MM-DD", "duration": "$ISO",
  "embedUrl": "https://fast.wistia.net/embed/iframe/${ID}", "publisher": { "@id": "https://www.closedin.io/#organization" } }
HTML
