@echo off
echo Starting De-Ransom in Demo Mode...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Start the frontend server
echo Starting frontend server...
start python frontend\static_server.py

echo De-Ransom frontend is now running in demo mode.
echo The application will simulate ransomware detection and blockchain interactions.
echo Press any key to exit...

pause
taskkill /F /IM python.exe /T
echo Demo stopped.