@echo off
REM
REM AI Enterprise - Start Servers (Windows)
REM Avvia il server Python Orchestrator e il Dashboard React
REM
REM Uso: start-servers.bat [--orchestrator-only] [--dashboard-only]
REM

setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "ORCHESTRATOR_DIR=%SCRIPT_DIR%packages\orchestrator"
set "DASHBOARD_DIR=%SCRIPT_DIR%packages\dashboard"

set START_ORCHESTRATOR=1
set START_DASHBOARD=1

REM Parse arguments
:parse_args
if "%~1"=="" goto :main
if "%~1"=="--orchestrator-only" (
    set START_DASHBOARD=0
    shift
    goto :parse_args
)
if "%~1"=="--dashboard-only" (
    set START_ORCHESTRATOR=0
    shift
    goto :parse_args
)
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
shift
goto :parse_args

:show_help
echo.
echo AI Enterprise - Start Servers
echo.
echo Usage: start-servers.bat [OPTIONS]
echo.
echo Options:
echo   --orchestrator-only    Start only the Python orchestrator server
echo   --dashboard-only       Start only the React dashboard
echo   --help, -h             Show this help message
echo.
echo Servers:
echo   Orchestrator API: http://localhost:8080
echo   Dashboard:        http://localhost:3000
echo.
exit /b 0

:main
echo.
echo ======================================================================
echo           AI Enterprise - Server Startup
echo           Orchestrator + Dashboard
echo ======================================================================
echo.

REM Check prerequisites
echo Checking prerequisites...

if %START_ORCHESTRATOR%==1 (
    where python >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in PATH
        exit /b 1
    )
    echo [OK] Python found

    if not exist "%ORCHESTRATOR_DIR%\.venv" (
        echo Creating Python virtual environment...
        cd /d "%ORCHESTRATOR_DIR%"
        python -m venv .venv
    )
)

if %START_DASHBOARD%==1 (
    where node >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Node.js is not installed or not in PATH
        exit /b 1
    )
    echo [OK] Node.js found

    if not exist "%DASHBOARD_DIR%\node_modules" (
        echo Installing dashboard dependencies...
        cd /d "%DASHBOARD_DIR%"
        call npm install
    )
)

echo.

REM Start Orchestrator
if %START_ORCHESTRATOR%==1 (
    echo Starting Python Orchestrator on port 8080...
    cd /d "%ORCHESTRATOR_DIR%"

    REM Activate venv and install dependencies
    call .venv\Scripts\activate.bat
    pip install -e . -q 2>nul

    REM Start server in new window
    start "AI Orchestrator" cmd /c "cd /d "%ORCHESTRATOR_DIR%" && .venv\Scripts\activate.bat && python run_server.py 8080"

    echo [OK] Orchestrator started
    echo     API: http://localhost:8080
    echo     Health: http://localhost:8080/api/health
    echo.

    REM Wait for server to start
    timeout /t 3 /nobreak >nul
)

REM Start Dashboard
if %START_DASHBOARD%==1 (
    echo Starting React Dashboard on port 3000...
    cd /d "%DASHBOARD_DIR%"

    REM Start dashboard in new window
    start "AI Dashboard" cmd /c "cd /d "%DASHBOARD_DIR%" && npm run dev"

    echo [OK] Dashboard started
    echo     URL: http://localhost:3000
    echo.

    REM Wait for server to start
    timeout /t 3 /nobreak >nul
)

echo.
echo ======================================================================
echo                    All servers running!
echo ======================================================================
echo.
echo Servers are running in separate windows.
echo Close the windows or press Ctrl+C in them to stop the servers.
echo.

REM Open dashboard in browser
if %START_DASHBOARD%==1 (
    echo Opening dashboard in browser...
    start http://localhost:3000
)

pause
