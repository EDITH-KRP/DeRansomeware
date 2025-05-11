@echo off
echo Starting De-Ransom in REAL MODE (not demo)
echo.
echo This will start the application with real ransomware detection and blockchain integration.
echo.
echo Make sure you have configured the .env file with your blockchain and IPFS credentials.
echo.
echo Press any key to start the application...
pause > nul

echo.
echo Running in real mode...
start "De-Ransom Real Mode" cmd /k "cd /d %~dp0 && python run.py"
echo.
echo The application should now be running in a new window.
echo You can access the web interface at http://localhost:5000
echo.
echo Press any key to exit this window...
pause > nul