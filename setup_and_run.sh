#!/usr/bin/env bash
# setup_and_run.sh — One-shot setup + launch for AIDR
# Run this in TWO separate terminals (one for backend, one for frontend)
#
# TERMINAL 1:  bash setup_and_run.sh backend
# TERMINAL 2:  bash setup_and_run.sh frontend

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-help}"

# ──────────────────────────────────────────────
#  BACKEND
# ──────────────────────────────────────────────
if [ "$MODE" = "backend" ]; then
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  🧠 AIDR Backend Setup & Launch"
  echo "═══════════════════════════════════════════"

  cd "$SCRIPT_DIR/backend"

  # Find Python 3.10+
  PYTHON=""
  for candidate in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$candidate" &>/dev/null; then
      VER=$("$candidate" -c "import sys; print(sys.version_info >= (3,10))" 2>/dev/null || echo "False")
      if [ "$VER" = "True" ]; then
        PYTHON="$candidate"
        break
      fi
    fi
  done

  if [ -z "$PYTHON" ]; then
    echo "❌  Python 3.10+ not found."
    echo "    Install from: https://www.python.org/downloads/"
    exit 1
  fi

  echo "✅  Python: $($PYTHON --version)"

  # Create venv
  if [ ! -d ".venv" ]; then
    echo "🐍  Creating virtual environment..."
    $PYTHON -m venv .venv
  fi

  source .venv/bin/activate
  echo "📦  Installing Python packages (this may take a few minutes)..."
  pip install --upgrade pip -q
  pip install -r requirements.txt -q

  echo ""
  echo "═══════════════════════════════════════════"
  echo "  🚀 Backend running at http://localhost:8000"
  echo "  📖 API docs at    http://localhost:8000/docs"
  echo "═══════════════════════════════════════════"
  echo ""
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# ──────────────────────────────────────────────
#  FRONTEND
# ──────────────────────────────────────────────
elif [ "$MODE" = "frontend" ]; then
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  ⚛️  AIDR Frontend Setup & Launch"
  echo "═══════════════════════════════════════════"

  # Add common Node paths (Homebrew, nvm, volta, fnm)
  export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.fnm:$PATH"
  # Also source nvm if present
  [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"

  if ! command -v node &>/dev/null; then
    echo "❌  Node.js not found."
    echo "    Install from: https://nodejs.org/  (choose LTS)"
    exit 1
  fi

  echo "✅  Node: $(node --version) / npm: $(npm --version)"

  cd "$SCRIPT_DIR/frontend"
  echo "📦  Installing npm packages..."
  npm install

  echo ""
  echo "═══════════════════════════════════════════"
  echo "  🚀 Frontend running at http://localhost:5173"
  echo "═══════════════════════════════════════════"
  echo ""
  npm run dev -- --open

# ──────────────────────────────────────────────
#  HELP
# ──────────────────────────────────────────────
else
  echo ""
  echo "AIDR — Diabetic Retinopathy Detection System"
  echo ""
  echo "Usage:"
  echo "  Open TWO Terminal windows and run:"
  echo ""
  echo "  Terminal 1 (Backend):   bash setup_and_run.sh backend"
  echo "  Terminal 2 (Frontend):  bash setup_and_run.sh frontend"
  echo ""
  echo "Then open http://localhost:5173 in your browser."
  echo ""
  echo "Default logins:"
  echo "  admin / admin123"
  echo "  doctor / doctor123"
fi
