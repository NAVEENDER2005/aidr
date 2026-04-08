#!/usr/bin/env bash
# start_frontend.sh — Install npm deps and start Vite dev server
set -e
cd "$(dirname "$0")/frontend"

# Find npm
if ! command -v npm &>/dev/null; then
  # Try common Homebrew locations
  for p in /opt/homebrew/bin /usr/local/bin; do
    if [ -f "$p/npm" ]; then
      export PATH="$p:$PATH"
      break
    fi
  done
fi

if ! command -v npm &>/dev/null; then
  echo "❌ npm not found. Install Node.js 18+ from https://nodejs.org/"
  exit 1
fi

echo "✅ Using $(node --version) / npm $(npm --version)"
echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "🚀 Frontend starting at http://localhost:5173"
echo "   (Proxying /api requests to http://localhost:8000)"
echo ""
npm run dev
