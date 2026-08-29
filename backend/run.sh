#!/usr/bin/env bash
set -e

if [ ! -d "venv" ]; then
    echo "Creating virtualenv..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

echo "Starting MADAD Backend on http://0.0.0.0:8000 ..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
