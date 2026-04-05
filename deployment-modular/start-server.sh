#!/bin/bash
# Unix/Linux/Mac script to start the offline server

echo ""
echo "======================================================================"
echo "🚀 Starting Modular Offline App Server..."
echo "======================================================================"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Error: Python 3 is not installed"
        echo "Please install Python 3 first:"
        echo "  macOS: brew install python3"
        echo "  Ubuntu/Debian: sudo apt-get install python3"
        exit 1
    fi
    PYTHON=python
else
    PYTHON=python3
fi

# Run the server
$PYTHON start-server.py
