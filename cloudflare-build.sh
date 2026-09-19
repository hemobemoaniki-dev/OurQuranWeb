#!/usr/bin/env bash
set -euo pipefail

npm ci --include=dev
npx expo export --platform web

echo "OurQuran desktop web build ready in ./dist"
