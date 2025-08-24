@echo off
REM Debug Control Script for AI Standards Kit (Windows)
REM Usage: debug-control.bat [enable|disable|status|verbose|performance]

setlocal EnableDelayedExpansion

REM Find the settings file relative to script location
set SCRIPT_DIR=%~dp0
set SETTINGS_FILE=%SCRIPT_DIR%..\.claude\settings.json

REM Check if settings file exists
if not exist "%SETTINGS_FILE%" (
    echo Error: Settings file not found at %SETTINGS_FILE%
    echo Please run this script from the ai-standards-kit directory
    exit /b 1
)

if "%1"=="enable" (
    echo 🔍 Enabling debug mode...
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json) | ForEach { $_.debug_mode.enabled = $true; $_ } | ConvertTo-Json -Depth 10 | Out-File '%SETTINGS_FILE%' -Encoding UTF8"
    echo ✅ Debug mode enabled
    goto :eof
)

if "%1"=="disable" (
    echo 🔇 Disabling debug mode...
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json) | ForEach { $_.debug_mode.enabled = $false; $_ } | ConvertTo-Json -Depth 10 | Out-File '%SETTINGS_FILE%' -Encoding UTF8"
    echo ✅ Debug mode disabled
    goto :eof
)

if "%1"=="verbose" (
    echo 📝 Enabling verbose routing...
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json) | ForEach { $_.debug_mode.enabled = $true; $_.debug_mode.verbose_routing = $true; $_ } | ConvertTo-Json -Depth 10 | Out-File '%SETTINGS_FILE%' -Encoding UTF8"
    echo ✅ Verbose routing enabled
    goto :eof
)

if "%1"=="performance" (
    echo ⚡ Enabling performance monitoring...
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json) | ForEach { $_.debug_mode.enabled = $true; $_.debug_mode.show_execution_summary = $true; $_ } | ConvertTo-Json -Depth 10 | Out-File '%SETTINGS_FILE%' -Encoding UTF8"
    echo ✅ Performance monitoring enabled
    goto :eof
)

if "%1"=="full" (
    echo 🚀 Enabling full debug mode...
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json) | ForEach { $_.debug_mode.enabled = $true; $_.debug_mode.verbose_routing = $true; $_.debug_mode.show_stack_detection = $true; $_.debug_mode.show_agent_selection = $true; $_.debug_mode.show_guide_loading = $true; $_.debug_mode.show_quality_gates = $true; $_.debug_mode.show_execution_summary = $true; $_ } | ConvertTo-Json -Depth 10 | Out-File '%SETTINGS_FILE%' -Encoding UTF8"
    echo ✅ Full debug mode enabled
    goto :eof
)

if "%1"=="status" (
    echo 📊 Current debug mode status:
    powershell -Command "(Get-Content '%SETTINGS_FILE%' | ConvertFrom-Json).debug_mode | ConvertTo-Json -Depth 5"
    goto :eof
)

if "%1"=="reports" (
    echo 📋 Recent debug reports:
    if exist ".claude\debug-reports\*.md" (
        dir /b /od ".claude\debug-reports\*.md" | tail -10
    ) else (
        echo No debug reports found
    )
    goto :eof
)

if "%1"=="clean" (
    echo 🧹 Cleaning old debug reports...
    if exist ".claude\debug-reports" (
        forfiles /p ".claude\debug-reports" /s /m *.md /c "cmd /c if @fsize gtr 0 del @path" 2>nul
        echo ✅ Cleanup completed
    ) else (
        echo No debug reports to clean
    )
    goto :eof
)

echo 🔧 AI Debug Control (Windows)
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   enable      - Enable basic debug mode
echo   disable     - Disable debug mode completely
echo   verbose     - Enable verbose routing details
echo   performance - Enable performance monitoring  
echo   full        - Enable all debug options
echo   status      - Show current debug configuration
echo   reports     - List recent debug reports
echo   clean       - Clean old debug reports
echo.
echo Examples:
echo   %0 enable ^&^& ai "create user controller"
echo   %0 verbose ^&^& ai "implement payment system"
echo   %0 status