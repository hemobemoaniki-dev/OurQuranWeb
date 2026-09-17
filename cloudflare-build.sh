#!/usr/bin/env bash
set -euo pipefail

rm -rf _site
mkdir -p _site

# Keep V55 as the binary-asset fallback, then overlay the editable V56+ source.
unzip -q ourquran_v55_calendar_hasanaat_fix.zip -d _site
rm -rf _site/src
find _site -maxdepth 1 -type f -name '*.txt' -delete
rm -f _site/preview.html _site/_headers _site/firestore.rules

if [[ -d site ]]; then
  cp -a site/. _site/
fi

python3 - <<'PY'
from pathlib import Path
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

touch _site/.nojekyll
