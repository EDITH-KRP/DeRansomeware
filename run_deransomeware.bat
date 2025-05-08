@echo off

:menu
cls
echo De-Ransomeware Application
echo ==========================
echo.
echo 1. Start the application (web interface)
echo 2. Run tests
echo 3. Test file monitoring (standalone)
echo 4. Simulate ransomware behavior (for testing)
echo 5. Monitor entire system (real-time protection)
echo 6. Install as background service
echo 7. Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="2" goto run_tests
if "%choice%"=="3" goto test_monitoring
if "%choice%"=="4" goto simulate_ransomware
if "%choice%"=="5" goto monitor_system
if "%choice%"=="6" goto background_service
if "%choice%"=="7" goto end

:start_app
echo.
echo Starting De-Ransomeware Application...
echo =====================================
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    exit /b 1
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import flask, web3, watchdog, dotenv" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found.
    echo Creating a sample .env file...
    echo WEB3_PROVIDER_URI=https://eth-sepolia.g.alchemy.com/v2/your-api-key > .env
    echo ALCHEMY_API_KEY=your-api-key >> .env
    echo ETHEREUM_PRIVATE_KEY=your-private-key >> .env
    echo CONTRACT_ADDRESS=your-contract-address >> .env
    echo BLOCKCHAIN_NETWORK=sepolia >> .env
    echo FILEBASE_ACCESS_KEY=your-access-key >> .env
    echo FILEBASE_SECRET_KEY=your-secret-key >> .env
    echo FILEBASE_BUCKET=de-ransome-ware >> .env
    echo.
    echo Please edit the .env file with your actual API keys and settings.
    echo Press any key to continue anyway in simulation mode...
    pause >nul
)

echo.
echo Starting De-Ransomeware server...
echo.
echo The application will run in a new window.
echo Close that window to stop the server.
echo.

REM Start the application in a new window
start "De-Ransomeware Server" cmd /c "python run.py & pause"

REM Wait a moment for the server to start
timeout /t 3 >nul

REM Open the web interface in the default browser
echo Opening web interface...
start http://localhost:5000

echo.
echo De-Ransomeware is now running!
echo.
echo To stop the application, close the server window.
echo.

goto end

:run_tests
echo.
echo Running De-Ransomeware Tests...
echo ==============================
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    exit /b 1
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import flask, requests" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    pip install flask requests
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        exit /b 1
    )
)

REM Check if the server is running
python -c "import requests; requests.get('http://localhost:5000')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Warning: The De-Ransomeware server does not appear to be running.
    echo Would you like to start it first?
    set /p start_server="Start server first? (y/n): "
    if /i "%start_server%"=="y" (
        start "De-Ransomeware Server" cmd /c "python run.py"
        echo Waiting for server to start...
        timeout /t 5 >nul
    )
)

REM Run the tests
echo Running tests...
python test_app.py

echo.
echo Tests completed.
echo.
pause
goto menu

:test_monitoring
echo.
echo Testing File Monitoring System
echo =============================
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    goto menu
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import watchdog" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    pip install watchdog
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        goto menu
    )
)

echo.
echo This will run the file monitoring system in standalone mode.
echo You will be prompted to enter a directory to monitor.
echo.
echo Press any key to continue...
pause >nul

REM Run the file monitoring test
python backend/simple_detector.py

echo.
pause
goto menu

:simulate_ransomware
echo.
echo Ransomware Behavior Simulator
echo ============================
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    goto menu
)

echo.
echo WARNING: This will simulate ransomware-like behavior for testing purposes.
echo It will NOT encrypt or damage files, but will rename them and create
echo ransom notes to trigger detection systems.
echo.
echo USE ONLY IN A CONTROLLED ENVIRONMENT WITH TEST FILES.
echo.
echo Options:
echo 1. Create test files and simulate on them
echo 2. Simulate on existing files
echo 3. Return to main menu
echo.
set /p sim_choice="Enter your choice (1-3): "

if "%sim_choice%"=="3" goto menu

echo.
set /p test_dir="Enter directory for simulation: "

if "%sim_choice%"=="1" (
    set /p file_count="How many test files to create? "
    python test_ransomware.py "%test_dir%" --create %file_count%
) else (
    python test_ransomware.py "%test_dir%"
)

echo.
pause
goto menu

:monitor_system
echo.
echo System-wide Monitoring
echo ====================
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    goto menu
)

REM Check if required packages are installed
echo Checking dependencies...
python -c "import watchdog" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    pip install watchdog
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        goto menu
    )
)

echo.
echo This will monitor your entire system for ransomware activity.
echo You can choose which directories to monitor.
echo.
echo Options:
echo 1. Monitor user directories (Documents, Desktop, Pictures, Downloads)
echo 2. Monitor entire system drive (C:)
echo 3. Configure custom directories
echo 4. Return to main menu
echo.
set /p monitor_choice="Enter your choice (1-4): "

if "%monitor_choice%"=="4" goto menu

if "%monitor_choice%"=="1" (
    echo.
    echo Starting monitoring of user directories...
    python final_monitor.py "%USERPROFILE%\Documents"
) else if "%monitor_choice%"=="2" (
    echo.
    echo Starting monitoring of entire system drive...
    python final_monitor.py "%SystemDrive%\"
) else if "%monitor_choice%"=="3" (
    echo.
    echo Enter directory to monitor:
    set /p custom_dir="Directory: "
    echo Starting monitoring of custom directory...
    python final_monitor.py "%custom_dir%"
) else (
    echo Invalid choice. Using default directories.
    python final_monitor.py
)

echo.
pause
goto menu

:background_service
echo.
echo Background Service Installation
echo ============================
echo.

REM Launch the background service manager
start background_service.bat

echo.
echo Background service manager launched in a new window.
echo.
pause
goto menu

:end
echo.
echo Thank you for using De-Ransomeware!
echo.
exit /b 0