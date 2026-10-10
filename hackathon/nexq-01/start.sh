#!/usr/bin/env bash
# NexQ-01 Root Startup Script for Linux, macOS & GitHub Codespaces
set -e

echo "=========================================================="
echo "   NexQ-01: Quantum Verification & Error Mitigation Engine"
echo "=========================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 1. Start Backend in Background
echo "[1/2] Setting up Python backend..."
cd "$BACKEND_DIR"

if command -v python3 &>/dev/null; then
    PY_BIN=python3
elif command -v python &>/dev/null; then
    PY_BIN=python
else
    echo "Error: Python 3 is required but not found in PATH."
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment in $BACKEND_DIR/venv..."
    $PY_BIN -m venv venv
fi

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
fi

echo "Installing backend dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo "Launching backend on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Trap cleanup to stop backend on script exit
trap "echo 'Stopping NexQ-01 servers...'; kill $BACKEND_PID 2>/dev/null || true; exit" SIGINT SIGTERM EXIT

# 2. Start Frontend
echo "[2/2] Setting up React frontend..."
cd "$FRONTEND_DIR"

if ! command -v npm &>/dev/null; then
    echo "Error: Node.js (npm) is required but not found in PATH."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (npm install)..."
    npm install
fi

echo "Launching frontend on http://localhost:5173..."
npm run dev
