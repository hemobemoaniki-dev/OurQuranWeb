#!/usr/bin/env bash
set -euo pipefail

npm ci --include=dev
npx expo export --platform web

# Keep the existing Cloudflare Pages output directory so the live project can
# switch from the legacy archive build without changing its dashboard settings.
rm -rf _site
cp -R dist _site

echo "OurQuran desktop web build ready in ./_site"
