@echo off
REM Windows batch file to start the offline server
echo.
echo ======================================================================
echo Starting Modular Offline App Server...
echo ======================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: Python is not installed or not in PATH
        echo Please install Python 3 from https://www.python.org
        pause
        exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)

REM Run the server
%PYTHON% start-server.py
pause
