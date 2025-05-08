@echo on
echo ===================================================
echo DeRansomeware Project Launcher
echo ===================================================
echo.
echo Starting execution with error tracing...
echo.

:: Check if Python is installed
echo Checking for Python installation...
where python
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    pause
    exit /b 1
)
echo Python found successfully.

:: Check Python version
echo Checking Python version...
python --version
for /f "tokens=2" %%a in ('python --version 2^>^&1') do set pyver=%%a
echo Detected Python version: %pyver%

:: Extract major and minor version
for /f "tokens=1,2 delims=." %%a in ("%pyver%") do (
    set pymajor=%%a
    set pyminor=%%b
)

echo Python major version: %pymajor%, minor version: %pyminor%

:: Check if Python version is 3.8 or higher
if %pymajor% LSS 3 (
    echo Warning: Python version 3.8 or higher is recommended.
    echo Current version %pyver% might not be compatible.
    set /p continue="Do you want to continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    if %pymajor% EQU 3 (
        if %pyminor% LSS 8 (
            echo Warning: Python version 3.8 or higher is recommended.
            echo Current version %pyver% might not be compatible.
            set /p continue="Do you want to continue anyway? (y/n): "
            if /i not "%continue%"=="y" exit /b 1
        )
    )
)
echo Python version check passed.

:: Create virtual environment if it doesn't exist
echo Checking for virtual environment...
if not exist venv (
    echo Virtual environment not found.
    echo Creating virtual environment...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo Failed to create virtual environment.
        echo Error code: %ERRORLEVEL%
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists.
)

:: Activate virtual environment
echo Activating virtual environment...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo Virtual environment activated.
) else (
    echo ERROR: Virtual environment activation script not found.
    echo Expected path: venv\Scripts\activate.bat
    echo Current directory: %CD%
    dir venv\Scripts
    pause
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
if exist requirements.txt (
    echo Found requirements.txt file.
    pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo Failed to install dependencies.
        echo Error code: %ERRORLEVEL%
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
) else (
    echo ERROR: requirements.txt file not found.
    echo Current directory: %CD%
    dir
    pause
    exit /b 1
)

:: Check if .env file exists
if not exist .env (
    echo Warning: .env file not found.
    echo Creating a basic .env file with default settings...
    (
        echo FLASK_HOST=localhost
        echo FLASK_PORT=5000
        echo DEBUG=True
        echo BLOCKCHAIN_NETWORK=development
        echo CONTRACT_ADDRESS=
        echo WEB3_PROVIDER_URI=
        echo INFURA_API_KEY=
        echo ETHEREUM_PRIVATE_KEY=
        echo FILEBASE_ACCESS_KEY=
        echo FILEBASE_SECRET_KEY=
        echo FILEBASE_BUCKET=
    ) > .env
    echo Created .env file with default settings.
    echo Please update the .env file with your actual configuration values.
)

:: Create logs directory if it doesn't exist
if not exist backend\logs mkdir backend\logs

:: Check if run.py exists
echo Checking for main application file...
if exist run.py (
    echo Found run.py file.
    
    :: Run the application
    echo.
    echo Starting DeRansomeware application...
    echo Press Ctrl+C to stop the server
    echo.
    python run.py
    
    :: Check if application started successfully
    if %ERRORLEVEL% neq 0 (
        echo Application failed to start.
        echo Error code: %ERRORLEVEL%
    ) else (
        echo Application exited successfully.
    )
) else (
    echo ERROR: run.py file not found.
    echo Current directory: %CD%
    dir
)

:: Deactivate virtual environment when done
echo Deactivating virtual environment...
call venv\Scripts\deactivate.bat
echo Virtual environment deactivated.

echo.
echo Script execution completed.
pause