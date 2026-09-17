#!/usr/bin/env bash
set -euo pipefail

rm -rf _site
mkdir _site
unzip -q ourquran_v55_calendar_hasanaat_fix.zip -d _site

rm -rf _site/src
find _site -maxdepth 1 -type f -name '*.txt' -delete
rm -f _site/preview.html _site/_headers _site/firestore.rules

python3 - <<'PY'
from pathlib import Path

config = Path('_site/site-config.js')
text = config.read_text()
text = text.replace(
    'publicSiteUrl: "https://ourquran.netlify.app/",',
    'publicSiteUrl: "https://ourquran.pages.dev/",'
)
text = text.replace(
    'publicSiteUrl: "https://hemobemoaniki-dev.github.io/OurQuranWeb/",',
    'publicSiteUrl: "https://ourquran.pages.dev/",'
)
text = text.replace(
    'publicSiteUrl: "https://ourquran.com/",',
    'publicSiteUrl: "https://ourquran.pages.dev/",'
)
config.write_text(text)

manifest = Path('_site/manifest.webmanifest')
text = manifest.read_text()
text = text.replace('"start_url": "./"', '"start_url": "/"')
text = text.replace('"scope": "./"', '"scope": "/"')
manifest.write_text(text)
PY

touch _site/.nojekyll
