@echo off
echo DeRansomeware Background Service Manager
echo =======================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo This script requires administrator privileges.
    echo Please right-click and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

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
python -c "import win32serviceutil, win32service, win32event, win32api, servicemanager" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    pip install pywin32 watchdog
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies.
        pause
        exit /b 1
    )
)

:menu
cls
echo DeRansomeware Background Service Manager
echo =======================================
echo.
echo 1. Install service (run at startup)
echo 2. Start service
echo 3. Stop service
echo 4. Remove service
echo 5. Check service status
echo 6. Configure monitored directories
echo 7. Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" goto install_service
if "%choice%"=="2" goto start_service
if "%choice%"=="3" goto stop_service
if "%choice%"=="4" goto remove_service
if "%choice%"=="5" goto check_status
if "%choice%"=="6" goto configure_dirs
if "%choice%"=="7" goto end

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto menu

:install_service
echo.
echo Installing DeRansomeware service...
python install_service.py install
echo.
pause
goto menu

:start_service
echo.
echo Starting DeRansomeware service...
python install_service.py start
echo.
pause
goto menu

:stop_service
echo.
echo Stopping DeRansomeware service...
python install_service.py stop
echo.
pause
goto menu

:remove_service
echo.
echo Removing DeRansomeware service...
python install_service.py remove
echo.
pause
goto menu

:check_status
echo.
echo Checking DeRansomeware service status...
python install_service.py status
echo.
pause
goto menu

:configure_dirs
echo.
echo Configuring monitored directories...
python install_service.py configure
echo.
pause
goto menu

:end
echo.
echo Thank you for using DeRansomeware!
echo.
exit /b 0