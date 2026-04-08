#!/usr/bin/env bash
# start_backend.sh — Set up venv and start FastAPI backend
set -e
cd "$(dirname "$0")/backend"

# Find Python 3.10+
PYTHON=""
for candidate in python3.12 python3.11 python3.10 python3 python; do
  if command -v "$candidate" &>/dev/null; then
    VER=$("$candidate" -c "import sys; print(sys.version_info >= (3,10))" 2>/dev/null)
    if [ "$VER" = "True" ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "❌ Python 3.10+ not found. Install from https://www.python.org/downloads/"
  exit 1
fi

echo "✅ Using $($PYTHON --version)"

# Create venv if needed
if [ ! -d ".venv" ]; then
  echo "🐍 Creating virtual environment..."
  $PYTHON -m venv .venv
fi

source .venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo ""
echo "🚀 Backend starting at http://localhost:8000"
echo "📖 API docs at       http://localhost:8000/docs"
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
