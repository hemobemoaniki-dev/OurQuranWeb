#!/usr/bin/env bash
set -euo pipefail

rm -rf _site
mkdir -p _site

# V55 remains the binary-asset baseline; V56 logic/UI is applied as a reviewable patch.
unzip -q ourquran_v55_calendar_hasanaat_fix.zip -d _site
rm -rf _site/src
find _site -maxdepth 1 -type f -name '*.txt' -delete
rm -f _site/preview.html _site/_headers _site/firestore.rules

if [[ -f patches/v56-premium-sync.patch.gz.b64 ]]; then
  base64 -d patches/v56-premium-sync.patch.gz.b64 | gzip -dc > /tmp/ourquran-v56.patch
  git apply --whitespace=nowarn --directory=_site /tmp/ourquran-v56.patch
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
