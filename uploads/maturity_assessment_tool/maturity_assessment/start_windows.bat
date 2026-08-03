@echo off
echo ========================================
echo Digital Technology Adoption Assessment
echo Quick Start Script
echo ========================================
echo.

echo Step 1: Installing Python packages...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo Error: Failed to install packages
    pause
    exit /b 1
)

echo.
echo Step 2: Starting the web application...
echo.
echo The application will open in your default browser
echo Press Ctrl+C to stop the server when done
echo.
echo Starting Flask server...
echo.

start http://127.0.0.1:5000
python app.py

pause
