#!/usr/bin/env bash
# NexQ-01 Backend Startup Script
set -e

echo "=== Starting NexQ-01 Quantum Backend Engine ==="

# Check Python version
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
else
    echo "Error: Python is not installed or not in PATH."
    exit 1
fi

echo "Using Python: $($PYTHON_CMD --version)"

# Create virtual environment if it does not exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment 'venv'..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
fi

# Install dependencies if needed
echo "Verifying backend dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo "Launching Uvicorn server on http://localhost:8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
