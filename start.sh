#!/bin/bash

# start.sh - One-click run script for EDA Playground Pro on macOS

# Resolve script directory to execute from correct location
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "   Starting EDA Playground Pro (VLSI IDE)    "
echo "============================================="
echo ""

# 1. Install dependencies if node_modules are missing
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "[SETUP] Missing node_modules detected. Installing dependencies..."
    npm run install-all
    if [ $? -ne 0 ]; then
        echo "[ERROR] Dependency installation failed. Please run 'npm run install-all' manually."
        exit 1
    fi
    echo "[SETUP] Installation successful."
    echo ""
fi

# 2. Wait 3 seconds in a background thread and open default web browser
(
    sleep 3
    echo "[BROWSER] Opening EDA Playground Pro at http://localhost:5173/"
    open "http://localhost:5173/"
) &

# 3. Start development servers in the foreground
echo "[SERVER] Launching React Client and Node.js Express Backend..."
npm run dev
