#!/usr/bin/env bash
set -euo pipefail

rm -rf _site
mkdir -p _site

# V58 deliberately starts from the last known-good V55 runtime. The V56/V57
# patch stack is NOT applied because preview QA found click/scroll regressions.
unzip -q ourquran_v55_calendar_hasanaat_fix.zip -d _site
rm -rf _site/src
find _site -maxdepth 1 -type f -name '*.txt' -delete
rm -f _site/preview.html _site/_headers _site/firestore.rules

# Overlay only the small, reviewable V58 layer.
if [[ -d site ]]; then
  cp -a site/. _site/
fi

python3 - <<'PY'
from pathlib import Path

index = Path('_site/index.html')
text = index.read_text()
css_tag = '  <link rel="stylesheet" href="v58.css?v=58" />\n'
js_tag = '  <script src="v58.js?v=58"></script>\n'
if 'v58.css?v=58' not in text:
    text = text.replace('</head>', css_tag + '</head>')
if 'v58.js?v=58' not in text:
    text = text.replace('</body>', js_tag + '</body>')
index.write_text(text)

config = Path('_site/site-config.js')
if config.exists():
    text = config.read_text()
    for old in (
        'https://ourquran.netlify.app/',
        'https://hemobemoaniki-dev.github.io/OurQuranWeb/',
        'https://ourquran.com/'
    ):
        text = text.replace(old, 'https://ourquran.pages.dev/')
    config.write_text(text)

manifest = Path('_site/manifest.webmanifest')
if manifest.exists():
    text = manifest.read_text().replace('"start_url": "./"','"start_url": "/"').replace('"scope": "./"','"scope": "/"')
    manifest.write_text(text)
PY

node --check _site/app.js
node --check _site/account-sync.js
node --check _site/v58.js

grep -q 'v58.css?v=58' _site/index.html
grep -q 'v58.js?v=58' _site/index.html
grep -q '002255.mp3' _site/v58.js

touch _site/.nojekyll
