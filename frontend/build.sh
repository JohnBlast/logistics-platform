#!/usr/bin/env bash
set -e
# Run Vite build directly (no tsc) - avoids devDependency resolution issues on Render
npx vite build
