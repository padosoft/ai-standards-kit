@echo off
REM
REM AI Enterprise - Stop Servers (Windows)
REM Ferma il server Python Orchestrator e il Dashboard React
REM
REM Uso: stop-servers.bat [--orchestrator-only] [--dashboard-only]
REM

setlocal EnableDelayedExpansion

set STOP_ORCHESTRATOR=1
set STOP_DASHBOARD=1

REM Parse arguments
:parse_args
if "%~1"=="" goto :main
if "%~1"=="--orchestrator-only" (
    set STOP_DASHBOARD=0
    shift
    goto :parse_args
)
if "%~1"=="--dashboard-only" (
    set STOP_ORCHESTRATOR=0
    shift
    goto :parse_args
)
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
shift
goto :parse_args

:show_help
echo.
echo AI Enterprise - Stop Servers
echo.
echo Usage: stop-servers.bat [OPTIONS]
echo.
echo Options:
echo   --orchestrator-only    Stop only the Python orchestrator server
echo   --dashboard-only       Stop only the React dashboard
echo   --help, -h             Show this help message
echo.
echo Ports:
echo   Orchestrator: 8080
echo   Dashboard:    3000
echo.
exit /b 0

:main
echo.
echo ======================================================================
echo           AI Enterprise - Stop Servers
echo ======================================================================
echo.

REM Stop Orchestrator (port 8080)
if %STOP_ORCHESTRATOR%==1 (
    echo Stopping Orchestrator (port 8080)...

    REM Find PIDs using port 8080 and kill them
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING 2^>nul') do (
        echo   Killing process %%a
        taskkill /F /PID %%a >nul 2>&1
    )

    REM Also kill any python processes running run_server.py
    for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /fo list 2^>nul ^| findstr PID') do (
        wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr "run_server.py" >nul 2>&1
        if not errorlevel 1 (
            echo   Killing Python server process %%a
            taskkill /F /PID %%a >nul 2>&1
        )
    )

    echo [OK] Orchestrator stopped
    echo.
)

REM Stop Dashboard (port 3000)
if %STOP_DASHBOARD%==1 (
    echo Stopping Dashboard (port 3000)...

    REM Find PIDs using port 3000 and kill them
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
        echo   Killing process %%a
        taskkill /F /PID %%a >nul 2>&1
    )

    REM Also kill any node processes running vite
    for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo list 2^>nul ^| findstr PID') do (
        wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr "vite" >nul 2>&1
        if not errorlevel 1 (
            echo   Killing Vite dev server process %%a
            taskkill /F /PID %%a >nul 2>&1
        )
    )

    echo [OK] Dashboard stopped
    echo.
)

echo.
echo ======================================================================
echo                    Servers stopped!
echo ======================================================================
echo.

pause
