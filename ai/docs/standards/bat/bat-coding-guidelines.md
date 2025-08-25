# BAT/CMD Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **Windows Batch (BAT/CMD)-specific** implementations of the enterprise coding guidelines. Always follow the global principles while applying these language-specific patterns.

## Script Header and Compatibility

### Script Header Standards
```batch
@echo off
:: ✅ Good - Proper script header
@echo off
setlocal EnableDelayedExpansion
setlocal EnableExtensions

:: Script: process_data.bat
:: Purpose: Process data files and generate reports
:: Author: Development Team
:: Date: 2025-01-25
:: Version: 1.0.0

:: ✅ Good - Character encoding for special characters
chcp 65001 >nul 2>&1

:: ❌ Bad - No echo off (shows all commands)
:: Missing setlocal (pollutes parent environment)
```

### Windows Version Requirements
```batch
:: Check Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do (
    set VERSION=%%i.%%j
)

if "%VERSION%" LSS "10.0" (
    echo Error: Windows 10 or higher required >&2
    exit /b 1
)

:: Check for PowerShell availability
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: PowerShell is required but not found >&2
    exit /b 1
)
```

## Variable Naming and Declaration

### Variable Naming Conventions
```batch
:: ✅ Good - Descriptive variable names
set "DATABASE_HOST=localhost"
set "MAX_RETRY_ATTEMPTS=3"
set "LOG_FILE_PATH=%TEMP%\app.log"
set "USER_INPUT="
set "IS_VALID_EMAIL=false"
set /a "PROCESSED_FILES_COUNT=0"

:: ✅ Good - Environment-specific variables
set "APP_HOME=%~dp0"
set "CONFIG_DIR=%APP_HOME%config"
set "DATA_DIR=%APP_HOME%data"

:: ❌ Bad - Single letter or abbreviated names
set "DB=localhost"
set "MAX=3"
set "u="
set "valid=false"
```

### Variable Declaration Best Practices
```batch
:: ✅ Good - Always use quotes to prevent issues with spaces
set "USER_NAME="
set "FILE_PATH=%~1"
set "OUTPUT_DIR=%~2"

:: ✅ Good - Numeric variables with /a flag
set /a "COUNTER=0"
set /a "EXIT_CODE=0"
set /a "MAX_LINES=100"

:: ✅ Good - Local scope with setlocal
setlocal
set "TEMP_VAR=local_value"
:: ... do work
endlocal

:: ✅ Good - Pass values out of local scope
setlocal
set "RESULT=computed_value"
endlocal & set "GLOBAL_RESULT=%RESULT%"

:: ❌ Bad - Variables without quotes (issues with special characters)
set FILE_PATH=%1
set OUTPUT_DIR=%2
```

## String Handling and Escaping

### Proper Quoting and Escaping
```batch
:: ✅ Good - Proper quoting prevents issues with spaces
set "FILE_NAME=My Document.txt"
set "FULL_PATH=C:\Program Files\My App\%FILE_NAME%"

:: ✅ Good - Handling special characters
set "SPECIAL_CHARS=Hello ^& Goodbye"
set "PIPE_CHAR=Text with pipe ^^| symbol"
set "PERCENT_SIGN=Value is 100%%"

:: ✅ Good - Path with spaces
if exist "%FULL_PATH%" (
    echo File found: "%FULL_PATH%"
)

:: ✅ Good - Delayed expansion for dynamic variables
setlocal EnableDelayedExpansion
for %%i in (1 2 3) do (
    set "VALUE_%%i=Item %%i"
    echo Current: !VALUE_%%i!
)
endlocal

:: ❌ Bad - Unquoted paths with spaces
if exist %FULL_PATH% (  :: This will fail
    echo File found
)
```

### String Manipulation
```batch
:: ✅ Good - Extract substring
set "FULL_PATH=C:\Users\Admin\Documents\file.txt"
:: Extract filename
for %%F in ("%FULL_PATH%") do set "FILE_NAME=%%~nxF"
:: Extract directory
for %%F in ("%FULL_PATH%") do set "DIR_PATH=%%~dpF"
:: Extract extension
for %%F in ("%FULL_PATH%") do set "EXTENSION=%%~xF"
:: Extract drive
for %%F in ("%FULL_PATH%") do set "DRIVE=%%~dF"

:: ✅ Good - String replacement
set "TEXT=Hello World"
set "REPLACED=%TEXT:World=Universe%"

:: ✅ Good - Remove quotes
set "QUOTED_TEXT="Some Text""
set "UNQUOTED=%QUOTED_TEXT:"=%"

:: ✅ Good - Trim spaces
set "TEXT_WITH_SPACES=  Hello World  "
for /f "tokens=*" %%a in ("%TEXT_WITH_SPACES%") do set "TRIMMED=%%a"

:: ✅ Good - Convert to uppercase/lowercase (using PowerShell)
for /f "usebackq" %%i in (`powershell -command "'%TEXT%'.ToUpper()"`) do set "UPPERCASE=%%i"
for /f "usebackq" %%i in (`powershell -command "'%TEXT%'.ToLower()"`) do set "LOWERCASE=%%i"
```

## Error Handling and Exit Codes

### Robust Error Handling
```batch
@echo off
setlocal EnableDelayedExpansion
setlocal EnableExtensions

:: ✅ Good - Error handling with ERRORLEVEL
:MAIN
    call :CHECK_PREREQUISITES
    if !ERRORLEVEL! NEQ 0 exit /b !ERRORLEVEL!
    
    call :PROCESS_FILES
    if !ERRORLEVEL! NEQ 0 (
        echo Error: File processing failed >&2
        exit /b !ERRORLEVEL!
    )
    
    echo Success: All operations completed
    exit /b 0

:CHECK_PREREQUISITES
    :: Check if required tools exist
    where git >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo Error: git is required but not installed >&2
        exit /b 2
    )
    
    :: Check if config file exists
    if not exist "%CONFIG_FILE%" (
        echo Error: Configuration file not found: %CONFIG_FILE% >&2
        exit /b 3
    )
    
    exit /b 0

:PROCESS_FILES
    set "ERROR_COUNT=0"
    
    for %%F in ("%DATA_DIR%\*.txt") do (
        call :PROCESS_SINGLE_FILE "%%F"
        if !ERRORLEVEL! NEQ 0 (
            set /a "ERROR_COUNT+=1"
            echo Warning: Failed to process %%F >&2
        )
    )
    
    if !ERROR_COUNT! GTR 0 (
        echo Error: Failed to process !ERROR_COUNT! files >&2
        exit /b 1
    )
    
    exit /b 0
```

### Exit Code Standards
```batch
:: Standard exit codes
set "EXIT_SUCCESS=0"
set "EXIT_GENERAL_ERROR=1"
set "EXIT_MISUSE=2"
set "EXIT_NOT_FOUND=3"
set "EXIT_PERMISSION_ERROR=5"
set "EXIT_CONFIG_ERROR=10"
set "EXIT_NETWORK_ERROR=11"

:: Usage
:VALIDATE_ARGUMENTS
    if "%~1"=="" (
        echo Usage: %~nx0 ^<input_file^> ^<output_dir^> >&2
        exit /b %EXIT_MISUSE%
    )
    
    if not exist "%~1" (
        echo Error: Input file does not exist: %~1 >&2
        exit /b %EXIT_NOT_FOUND%
    )
    
    exit /b %EXIT_SUCCESS%
```

## Function Design Patterns

### Function Structure (Labels)
```batch
:: ✅ Good - Well-structured function with error handling
:PROCESS_JSON_FILE
    :: Function: Process JSON file and extract data
    :: Arguments:
    ::   %1 - Input JSON file path
    ::   %2 - Output directory path
    ::   %3 - (optional) Format: json|xml|csv (default: json)
    :: Returns:
    ::   0 - Success
    ::   1 - Invalid arguments
    ::   2 - Processing error
    
    setlocal
    set "INPUT_FILE=%~1"
    set "OUTPUT_DIR=%~2"
    set "FORMAT=%~3"
    if "%FORMAT%"=="" set "FORMAT=json"
    
    :: Input validation
    if "%INPUT_FILE%"=="" (
        echo Error: Input file not specified >&2
        endlocal & exit /b 1
    )
    
    if not exist "%INPUT_FILE%" (
        echo Error: Input file not found: %INPUT_FILE% >&2
        endlocal & exit /b 1
    )
    
    if not exist "%OUTPUT_DIR%" (
        echo Error: Output directory not found: %OUTPUT_DIR% >&2
        endlocal & exit /b 1
    )
    
    :: Main processing logic
    set "TEMP_FILE=%TEMP%\process_%RANDOM%.tmp"
    
    :: Process with PowerShell
    powershell -Command "Get-Content '%INPUT_FILE%' | ConvertFrom-Json | ConvertTo-Json" > "%TEMP_FILE%" 2>nul
    if !ERRORLEVEL! NEQ 0 (
        echo Error: Failed to process JSON file >&2
        del /f /q "%TEMP_FILE%" 2>nul
        endlocal & exit /b 2
    )
    
    :: Generate output based on format
    if /i "%FORMAT%"=="json" (
        copy /y "%TEMP_FILE%" "%OUTPUT_DIR%\processed.json" >nul
    ) else if /i "%FORMAT%"=="xml" (
        powershell -Command "(Get-Content '%TEMP_FILE%' | ConvertFrom-Json) | ConvertTo-Xml -As String" > "%OUTPUT_DIR%\processed.xml"
    ) else if /i "%FORMAT%"=="csv" (
        powershell -Command "Get-Content '%TEMP_FILE%' | ConvertFrom-Json | Export-Csv '%OUTPUT_DIR%\processed.csv' -NoTypeInformation"
    ) else (
        echo Error: Unsupported format: %FORMAT% >&2
        del /f /q "%TEMP_FILE%" 2>nul
        endlocal & exit /b 1
    )
    
    :: Cleanup
    del /f /q "%TEMP_FILE%" 2>nul
    echo Successfully processed '%INPUT_FILE%' to '%OUTPUT_DIR%'
    endlocal & exit /b 0
```

### Parameter Validation Patterns
```batch
:: ✅ Good - Comprehensive parameter validation
:VALIDATE_EMAIL
    setlocal
    set "EMAIL=%~1"
    
    :: Check if email is provided
    if "%EMAIL%"=="" (
        endlocal & exit /b 1
    )
    
    :: Basic format check using findstr
    echo %EMAIL% | findstr /r "^[a-zA-Z0-9][a-zA-Z0-9._%%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z][a-zA-Z]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        endlocal & exit /b 1
    )
    
    endlocal & exit /b 0

:VALIDATE_PORT
    setlocal
    set "PORT=%~1"
    
    :: Check if it's a number
    echo %PORT% | findstr /r "^[0-9][0-9]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        endlocal & exit /b 1
    )
    
    :: Check range (1-65535)
    if %PORT% LSS 1 (
        endlocal & exit /b 1
    )
    if %PORT% GTR 65535 (
        endlocal & exit /b 1
    )
    
    endlocal & exit /b 0
```

## Array and List Handling

### Working with Lists
```batch
:: ✅ Good - Simulating arrays with indexed variables
setlocal EnableDelayedExpansion

:: Initialize array
set "FILE_COUNT=0"
for %%F in ("%DATA_DIR%\*.txt") do (
    set /a "FILE_COUNT+=1"
    set "FILE_!FILE_COUNT!=%%F"
)

:: Iterate through array
for /l %%i in (1,1,%FILE_COUNT%) do (
    echo Processing file %%i: !FILE_%%i!
    call :PROCESS_FILE "!FILE_%%i!"
)

:: ✅ Good - Using delimited strings as lists
set "SUPPORTED_FORMATS=json,xml,yaml,csv"
set "VALID=false"

:: Check if format is in list
for %%F in (%SUPPORTED_FORMATS:,= %) do (
    if /i "%%F"=="%USER_FORMAT%" set "VALID=true"
)

if "%VALID%"=="false" (
    echo Error: Unsupported format: %USER_FORMAT% >&2
    exit /b 1
)

:: ✅ Good - Dynamic list building
set "FAILED_FILES="
for %%F in (*.txt) do (
    call :PROCESS_FILE "%%F"
    if !ERRORLEVEL! NEQ 0 (
        if "!FAILED_FILES!"=="" (
            set "FAILED_FILES=%%F"
        ) else (
            set "FAILED_FILES=!FAILED_FILES!,%%F"
        )
    )
)

if not "%FAILED_FILES%"=="" (
    echo Failed files: %FAILED_FILES% >&2
)
```

## File and Directory Operations

### Safe File Operations
```batch
:: ✅ Good - Safe file reading with error handling
:READ_CONFIG_FILE
    setlocal
    set "CONFIG_FILE=%~1"
    
    if not exist "%CONFIG_FILE%" (
        echo Error: Config file not found: %CONFIG_FILE% >&2
        endlocal & exit /b 1
    )
    
    :: Check read permissions
    icacls "%CONFIG_FILE%" | findstr /i "%USERNAME%:R" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: No read permission for: %CONFIG_FILE% >&2
        endlocal & exit /b 1
    )
    
    :: Read configuration line by line
    for /f "usebackq tokens=1,2 delims==" %%A in ("%CONFIG_FILE%") do (
        :: Skip comments and empty lines
        echo %%A | findstr /r "^#" >nul && goto :CONTINUE
        if "%%A"=="" goto :CONTINUE
        
        :: Set configuration variable
        set "CONFIG_%%A=%%B"
        :CONTINUE
    )
    
    :: Export config variables to parent scope
    for /f "tokens=1,* delims==" %%A in ('set CONFIG_ 2^>nul') do (
        endlocal & set "%%A=%%B"
    )
    exit /b 0

:: ✅ Good - Safe temporary file handling
:CREATE_TEMP_WORKSPACE
    setlocal
    set "TEMP_DIR=%TEMP%\app_%RANDOM%_%DATE:~-4%%DATE:~-10,2%%DATE:~-7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
    set "TEMP_DIR=%TEMP_DIR: =0%"
    
    mkdir "%TEMP_DIR%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to create temporary directory >&2
        endlocal & exit /b 1
    )
    
    endlocal & set "WORKSPACE=%TEMP_DIR%" & exit /b 0

:: ✅ Good - Directory traversal protection
:VALIDATE_PATH
    setlocal
    set "USER_PATH=%~1"
    set "BASE_DIR=%~2"
    
    :: Get absolute paths
    pushd "%BASE_DIR%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Invalid base directory >&2
        endlocal & exit /b 1
    )
    set "ABS_BASE=%CD%"
    popd
    
    pushd "%USER_PATH%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        :: Try as file
        pushd "%~dp1" 2>nul
        if %ERRORLEVEL% NEQ 0 (
            echo Error: Invalid path >&2
            endlocal & exit /b 1
        )
    )
    set "ABS_PATH=%CD%"
    popd
    
    :: Check if path is within base directory
    echo %ABS_PATH% | findstr /i "^%ABS_BASE%" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Path is outside allowed directory >&2
        endlocal & exit /b 1
    )
    
    endlocal & exit /b 0
```

### Atomic Operations
```batch
:: ✅ Good - Atomic file updates
:UPDATE_CONFIG_ATOMICALLY
    setlocal
    set "CONFIG_FILE=%~1"
    set "TEMP_FILE=%CONFIG_FILE%.tmp.%RANDOM%"
    
    :: Create new config in temporary file
    (
        echo # Generated on %DATE% %TIME%
        echo version=1.0
        echo updated_at=%DATE% %TIME%
        :: ... other config values
    ) > "%TEMP_FILE%"
    
    :: Validate the new config
    call :VALIDATE_CONFIG_FILE "%TEMP_FILE%"
    if %ERRORLEVEL% NEQ 0 (
        del /f /q "%TEMP_FILE%" 2>nul
        echo Error: Generated config is invalid >&2
        endlocal & exit /b 1
    )
    
    :: Atomic move (Windows doesn't have atomic move, so we use copy+delete)
    copy /y "%TEMP_FILE%" "%CONFIG_FILE%" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        del /f /q "%TEMP_FILE%" 2>nul
        echo Error: Failed to update config file >&2
        endlocal & exit /b 1
    )
    
    del /f /q "%TEMP_FILE%" 2>nul
    echo Config file updated successfully
    endlocal & exit /b 0
```

## Process and Command Management

### Command Execution Patterns
```batch
:: ✅ Good - Safe command execution with timeout
:EXECUTE_WITH_TIMEOUT
    setlocal
    set "TIMEOUT_SECONDS=%~1"
    set "COMMAND=%~2"
    
    :: Start command in background
    start /b cmd /c "%COMMAND%" > "%TEMP%\output_%RANDOM%.tmp" 2>&1
    set "START_TIME=%TIME%"
    
    :: Wait with timeout using timeout command
    timeout /t %TIMEOUT_SECONDS% /nobreak >nul 2>&1
    
    :: Check if process is still running
    tasklist | findstr /i "%COMMAND%" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        :: Kill the process if still running
        taskkill /f /im "%COMMAND%" >nul 2>&1
        echo Error: Command timed out after %TIMEOUT_SECONDS% seconds >&2
        endlocal & exit /b 124
    )
    
    endlocal & exit /b 0

:: ✅ Good - Retry mechanism
:RETRY_COMMAND
    setlocal
    set "MAX_ATTEMPTS=%~1"
    set "DELAY=%~2"
    set "COMMAND=%~3"
    
    set /a "ATTEMPT=1"
    :RETRY_LOOP
    echo Attempt %ATTEMPT%/%MAX_ATTEMPTS%: %COMMAND%
    
    call %COMMAND%
    if %ERRORLEVEL% EQU 0 (
        echo Command succeeded on attempt %ATTEMPT%
        endlocal & exit /b 0
    )
    
    if %ATTEMPT% LSS %MAX_ATTEMPTS% (
        echo Command failed, retrying in %DELAY% seconds...
        timeout /t %DELAY% /nobreak >nul
        set /a "ATTEMPT+=1"
        goto :RETRY_LOOP
    )
    
    echo Command failed after %MAX_ATTEMPTS% attempts >&2
    endlocal & exit /b 1
```

### Background Process Management
```batch
:: ✅ Good - Background job management
:START_BACKGROUND_JOB
    setlocal
    set "JOB_NAME=%~1"
    set "LOG_FILE=%~2"
    set "COMMAND=%~3"
    
    echo Starting job: %JOB_NAME%
    
    :: Start job in background
    start /b cmd /c "%COMMAND% > "%LOG_FILE%" 2>&1 & echo %%ERRORLEVEL%% > "%TEMP%\%JOB_NAME%.exitcode""
    
    :: Get PID (Windows approach)
    for /f "tokens=2 delims= " %%a in ('tasklist /v ^| findstr /i "%JOB_NAME%"') do (
        set "PID=%%a"
        goto :PID_FOUND
    )
    :PID_FOUND
    
    :: Store PID for later reference
    echo %PID% > "%TEMP%\%JOB_NAME%.pid"
    
    echo Job %JOB_NAME% started with PID %PID%
    echo Logs: %LOG_FILE%
    
    endlocal & exit /b 0

:STOP_BACKGROUND_JOB
    setlocal
    set "JOB_NAME=%~1"
    set "PID_FILE=%TEMP%\%JOB_NAME%.pid"
    
    if not exist "%PID_FILE%" (
        echo No PID file found for job: %JOB_NAME% >&2
        endlocal & exit /b 1
    )
    
    set /p PID=<"%PID_FILE%"
    
    :: Check if process is running
    tasklist /fi "PID eq %PID%" | findstr /i "%PID%" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Stopping job %JOB_NAME% (PID: %PID%)
        taskkill /pid %PID% /f >nul 2>&1
        del /f /q "%PID_FILE%" 2>nul
        echo Job %JOB_NAME% stopped
    ) else (
        echo Job %JOB_NAME% is not running
        del /f /q "%PID_FILE%" 2>nul
    )
    
    endlocal & exit /b 0
```

## Logging and Debugging

### Structured Logging
```batch
:: ✅ Good - Structured logging system
@echo off
setlocal EnableDelayedExpansion

:: Log levels
set "LOG_LEVEL_DEBUG=0"
set "LOG_LEVEL_INFO=1"
set "LOG_LEVEL_WARN=2"
set "LOG_LEVEL_ERROR=3"

:: Default settings
if not defined LOG_LEVEL set "LOG_LEVEL=%LOG_LEVEL_INFO%"
if not defined LOG_FILE set "LOG_FILE="

:LOG
    :: Usage: call :LOG level message
    setlocal
    set "LEVEL=%~1"
    set "MESSAGE=%~2"
    set "TIMESTAMP=%DATE% %TIME%"
    
    :: Check if we should log this level
    set "SHOULD_LOG=0"
    if "%LEVEL%"=="DEBUG" if %LOG_LEVEL% LEQ %LOG_LEVEL_DEBUG% set "SHOULD_LOG=1"
    if "%LEVEL%"=="INFO" if %LOG_LEVEL% LEQ %LOG_LEVEL_INFO% set "SHOULD_LOG=1"
    if "%LEVEL%"=="WARN" if %LOG_LEVEL% LEQ %LOG_LEVEL_WARN% set "SHOULD_LOG=1"
    if "%LEVEL%"=="ERROR" if %LOG_LEVEL% LEQ %LOG_LEVEL_ERROR% set "SHOULD_LOG=1"
    
    if "%SHOULD_LOG%"=="0" (
        endlocal & exit /b 0
    )
    
    set "LOG_LINE=[%TIMESTAMP%] [%LEVEL%] [PID:%RANDOM%] %MESSAGE%"
    
    :: Output to console
    if "%LEVEL%"=="WARN" (
        echo %LOG_LINE% >&2
    ) else if "%LEVEL%"=="ERROR" (
        echo %LOG_LINE% >&2
    ) else (
        echo %LOG_LINE%
    )
    
    :: Also log to file if specified
    if not "%LOG_FILE%"=="" (
        echo %LOG_LINE% >> "%LOG_FILE%"
    )
    
    endlocal & exit /b 0

:: Convenience functions
:LOG_DEBUG
    call :LOG "DEBUG" "%~1"
    exit /b 0

:LOG_INFO
    call :LOG "INFO" "%~1"
    exit /b 0

:LOG_WARN
    call :LOG "WARN" "%~1"
    exit /b 0

:LOG_ERROR
    call :LOG "ERROR" "%~1"
    exit /b 0

:: Usage examples
call :LOG_INFO "Starting application"
call :LOG_DEBUG "Processing file: %FILE_PATH%"
call :LOG_WARN "Configuration file not found, using defaults"
call :LOG_ERROR "Failed to connect to database"
```

### Debug Mode Support
```batch
:: ✅ Good - Debug mode implementation
@echo off
set "SCRIPT_NAME=%~nx0"
if not defined DEBUG set "DEBUG=false"

:DEBUG_PRINT
    if /i "%DEBUG%"=="true" (
        echo DEBUG [%SCRIPT_NAME%]: %* >&2
    )
    exit /b 0

:DEBUG_VARS
    if /i "%DEBUG%"=="true" (
        echo DEBUG [%SCRIPT_NAME%]: Variables: >&2
        for %%V in (%*) do (
            echo   %%V=!%%V! >&2
        )
    )
    exit /b 0

:: Enable verbose mode based on debug
if /i "%DEBUG%"=="true" (
    echo on
    call :LOG_INFO "Debug mode enabled"
)

:: Usage
call :DEBUG_PRINT "Starting file processing"
call :DEBUG_VARS INPUT_FILE OUTPUT_DIR FORMAT
```

## Resource Cleanup and Exit Handling

### Cleanup Patterns
```batch
:: ✅ Good - Comprehensive cleanup
@echo off
setlocal EnableDelayedExpansion

:: Initialize cleanup lists
set "TEMP_FILES="
set "TEMP_DIRS="
set "LOCK_FILES="

:: Register cleanup handler
set "CLEANUP_REGISTERED=false"

:CLEANUP
    echo Performing cleanup... >&2
    
    :: Remove temporary files
    for %%F in (%TEMP_FILES%) do (
        if exist "%%F" (
            del /f /q "%%F" 2>nul
            echo Removed temporary file: %%F >&2
        )
    )
    
    :: Remove temporary directories
    for %%D in (%TEMP_DIRS%) do (
        if exist "%%D" (
            rmdir /s /q "%%D" 2>nul
            echo Removed temporary directory: %%D >&2
        )
    )
    
    :: Remove lock files
    for %%L in (%LOCK_FILES%) do (
        if exist "%%L" (
            del /f /q "%%L" 2>nul
            echo Removed lock file: %%L >&2
        )
    )
    
    echo Cleanup completed >&2
    exit /b %ERRORLEVEL%

:: Helper functions to register resources for cleanup
:REGISTER_TEMP_FILE
    set "TEMP_FILES=%TEMP_FILES% %~1"
    exit /b 0

:REGISTER_TEMP_DIR
    set "TEMP_DIRS=%TEMP_DIRS% %~1"
    exit /b 0

:REGISTER_LOCK_FILE
    set "LOCK_FILES=%LOCK_FILES% %~1"
    exit /b 0

:: Usage example
:MAIN
    :: Create temp file
    set "TEMP_FILE=%TEMP%\data_%RANDOM%.tmp"
    echo test > "%TEMP_FILE%"
    call :REGISTER_TEMP_FILE "%TEMP_FILE%"
    
    :: Ensure cleanup on exit
    if "%CLEANUP_REGISTERED%"=="false" (
        set "CLEANUP_REGISTERED=true"
        :: Note: Windows doesn't have signal handling like Unix
        :: Cleanup must be called explicitly
    )
    
    :: Do work...
    
    :: Call cleanup before exit
    call :CLEANUP
    exit /b %ERRORLEVEL%
```

## Testing and Validation

### Input Validation
```batch
:: ✅ Good - Comprehensive input validation
:VALIDATE_INPUT
    setlocal
    set "INPUT=%~1"
    set "TYPE=%~2"
    
    if /i "%TYPE%"=="email" (
        echo %INPUT% | findstr /r "^[a-zA-Z0-9][a-zA-Z0-9._%%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z][a-zA-Z]*$" >nul
        endlocal & exit /b %ERRORLEVEL%
    )
    
    if /i "%TYPE%"=="ip" (
        :: Validate IPv4 address
        echo %INPUT% | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
        if %ERRORLEVEL% NEQ 0 (
            endlocal & exit /b 1
        )
        :: Additional validation would check each octet is 0-255
        endlocal & exit /b 0
    )
    
    if /i "%TYPE%"=="port" (
        echo %INPUT% | findstr /r "^[0-9][0-9]*$" >nul
        if %ERRORLEVEL% NEQ 0 (
            endlocal & exit /b 1
        )
        if %INPUT% LSS 1 (
            endlocal & exit /b 1
        )
        if %INPUT% GTR 65535 (
            endlocal & exit /b 1
        )
        endlocal & exit /b 0
    )
    
    if /i "%TYPE%"=="url" (
        echo %INPUT% | findstr /r "^https*://" >nul
        endlocal & exit /b %ERRORLEVEL%
    )
    
    if /i "%TYPE%"=="filename" (
        :: Check for invalid characters
        echo %INPUT% | findstr /r "[<>:\"|?*]" >nul
        if %ERRORLEVEL% EQU 0 (
            endlocal & exit /b 1
        )
        endlocal & exit /b 0
    )
    
    endlocal & exit /b 1

:: ✅ Good - Test framework
:RUN_TESTS
    setlocal EnableDelayedExpansion
    set /a "TESTS_PASSED=0"
    set /a "TESTS_TOTAL=0"
    
    echo Running validation tests...
    
    :: Email validation tests
    call :TEST_VALIDATE "user@example.com" "email" "0"
    call :TEST_VALIDATE "invalid.email" "email" "1"
    call :TEST_VALIDATE "@example.com" "email" "1"
    
    :: Port validation tests
    call :TEST_VALIDATE "80" "port" "0"
    call :TEST_VALIDATE "65535" "port" "0"
    call :TEST_VALIDATE "0" "port" "1"
    call :TEST_VALIDATE "70000" "port" "1"
    call :TEST_VALIDATE "abc" "port" "1"
    
    echo.
    echo Tests passed: %TESTS_PASSED%/%TESTS_TOTAL%
    
    if %TESTS_PASSED% EQU %TESTS_TOTAL% (
        echo All tests passed!
        endlocal & exit /b 0
    ) else (
        echo Some tests failed!
        endlocal & exit /b 1
    )

:TEST_VALIDATE
    set "INPUT=%~1"
    set "TYPE=%~2"
    set "EXPECTED=%~3"
    set /a "TESTS_TOTAL+=1"
    
    call :VALIDATE_INPUT "%INPUT%" "%TYPE%"
    set "RESULT=%ERRORLEVEL%"
    
    if "%RESULT%"=="%EXPECTED%" (
        echo [PASS] %TYPE% validation: %INPUT%
        set /a "TESTS_PASSED+=1"
    ) else (
        echo [FAIL] %TYPE% validation: %INPUT% (expected: %EXPECTED%, got: %RESULT%)
    )
    exit /b 0
```

## Performance Considerations

### Efficient Batch Patterns
```batch
:: ✅ Good - Use native commands instead of external tools
:: Instead of using external 'find' or 'grep'
dir /b /s *.txt 2>nul

:: Instead of 'wc -l' for line counting
for /f %%a in ('type "%FILE%" ^| find /c /v ""') do set "LINE_COUNT=%%a"

:: ✅ Good - Minimize file I/O operations
:: Read file once and process in memory
setlocal EnableDelayedExpansion
set "CONTENT="
for /f "usebackq delims=" %%L in ("%INPUT_FILE%") do (
    set "CONTENT=!CONTENT!%%L "
)
:: Process CONTENT variable instead of re-reading file

:: ✅ Good - Use FOR loops efficiently
:: Process multiple files in single loop
for %%F in (*.txt *.log *.dat) do (
    if exist "%%F" call :PROCESS_FILE "%%F"
)

:: ✅ Good - Avoid GOTO in loops when possible
:: Use CALL instead of GOTO for better performance
for %%F in (*.txt) do (
    call :PROCESS_FILE "%%F"
)

:: ❌ Bad - Inefficient command chaining
type "%FILE%" | find "pattern" | find /c /v ""  :: Multiple pipes slow

:: Better approach
findstr /c:"pattern" "%FILE%" >nul 2>&1
if %ERRORLEVEL% EQU 0 echo Pattern found
```

### Optimizing Common Operations
```batch
:: ✅ Good - Efficient directory existence check
if exist "%DIR%\*" (
    echo Directory exists
) else (
    echo Directory does not exist or is empty
)

:: ✅ Good - Fast file counting
for /f %%a in ('dir /b /a-d "%DIR%" 2^>nul ^| find /c /v ""') do set "FILE_COUNT=%%a"

:: ✅ Good - Efficient string comparison
if /i "%VAR1%"=="%VAR2%" (
    echo Strings match (case-insensitive)
)

:: ✅ Good - Batch processing with delayed expansion
setlocal EnableDelayedExpansion
for %%F in (*.txt) do (
    set "COUNT=0"
    for /f %%L in (%%F) do set /a "COUNT+=1"
    echo %%F has !COUNT! lines
)
endlocal
```

## PowerShell Integration

### Leveraging PowerShell for Complex Tasks
```batch
:: ✅ Good - Use PowerShell for JSON processing
:PROCESS_JSON
    setlocal
    set "JSON_FILE=%~1"
    set "PROPERTY=%~2"
    
    for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$json = Get-Content '%JSON_FILE%' -Raw | ConvertFrom-Json; $json.%PROPERTY%"`) do (
        set "RESULT=%%R"
    )
    
    endlocal & set "JSON_VALUE=%RESULT%" & exit /b 0

:: ✅ Good - Use PowerShell for date calculations
:GET_DATE_OFFSET
    setlocal
    set "DAYS=%~1"
    
    for /f "usebackq" %%D in (`powershell -NoProfile -Command "(Get-Date).AddDays(%DAYS%).ToString('yyyy-MM-dd')"`) do (
        set "NEW_DATE=%%D"
    )
    
    endlocal & set "OFFSET_DATE=%NEW_DATE%" & exit /b 0

:: ✅ Good - Use PowerShell for complex regex
:REGEX_MATCH
    setlocal
    set "TEXT=%~1"
    set "PATTERN=%~2"
    
    powershell -NoProfile -Command "if ('%TEXT%' -match '%PATTERN%') { exit 0 } else { exit 1 }"
    endlocal & exit /b %ERRORLEVEL%
```

## Security Best Practices

### Secure Coding Patterns
```batch
:: ✅ Good - Prevent command injection
:SAFE_EXECUTE
    setlocal
    set "USER_INPUT=%~1"
    
    :: Sanitize input - remove dangerous characters
    set "SAFE_INPUT=%USER_INPUT:"=%"
    set "SAFE_INPUT=%SAFE_INPUT:&=%"
    set "SAFE_INPUT=%SAFE_INPUT:|=%"
    set "SAFE_INPUT=%SAFE_INPUT:>=%"
    set "SAFE_INPUT=%SAFE_INPUT:<%"
    set "SAFE_INPUT=%SAFE_INPUT:^=%"
    
    :: Use sanitized input
    echo Processing: %SAFE_INPUT%
    endlocal & exit /b 0

:: ✅ Good - Secure credential handling
:GET_CREDENTIAL
    setlocal
    set /p "USERNAME=Enter username: "
    
    :: Hide password input using PowerShell
    for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p = Read-Host 'Enter password' -AsSecureString; $p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p)); Write-Output $p"`) do (
        set "PASSWORD=%%P"
    )
    
    :: Never log passwords
    call :LOG_INFO "User %USERNAME% authenticated"
    :: Use credentials...
    
    :: Clear sensitive variables
    set "PASSWORD="
    endlocal & exit /b 0

:: ✅ Good - File permission checks
:CHECK_FILE_PERMISSIONS
    setlocal
    set "FILE=%~1"
    
    :: Check if file has proper permissions
    icacls "%FILE%" | findstr /i "Everyone:F" >nul
    if %ERRORLEVEL% EQU 0 (
        echo Warning: File has excessive permissions >&2
        endlocal & exit /b 1
    )
    
    endlocal & exit /b 0
```

## Script Lifecycle Management

### Script Initialization Pattern
```batch
@echo off
:: ✅ Good - Standard script initialization
setlocal EnableDelayedExpansion
setlocal EnableExtensions

:: Script metadata
set "SCRIPT_NAME=%~nx0"
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_VERSION=1.0.0"

:: Enable UTF-8 for better character support
chcp 65001 >nul 2>&1

:: Start timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "START_TIME=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%.%dt:~8,2%.%dt:~10,2%.%dt:~12,2%"
echo [ROCKET] Script %SCRIPT_NAME% starts at %START_TIME%

:: ✅ Good - Initialize constants and paths AFTER start message
set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
set "MYSQLDUMP_BIN=C:\xampp\mysql\bin\mysqldump.exe"
set "BACKUP_DIR=C:\backup"
set "LOG_DIR=C:\logs\%SCRIPT_NAME:.bat=%"

:: Default values (can be overridden by config)
set "DEFAULT_USER=admin"
set "DEFAULT_HOST=localhost"
set "DEFAULT_PORT=3306"

:: ✅ Good - Load configuration file if exists
set "CONFIG_FILE=%SCRIPT_DIR%%SCRIPT_NAME:.bat=%.config"
if exist "%CONFIG_FILE%" (
    echo [CONFIG] Loading settings from %CONFIG_FILE%
    call "%CONFIG_FILE%"
) else (
    echo [INFO] Using default settings ^(config file not found: %CONFIG_FILE%^)
)

:: Apply defaults for unset variables
if not defined DB_USER set "DB_USER=%DEFAULT_USER%"
if not defined DB_HOST set "DB_HOST=%DEFAULT_HOST%"
if not defined DB_PORT set "DB_PORT=%DEFAULT_PORT%"
```

### Help System Implementation
```batch
:: ✅ Good - Comprehensive help function
:SHOW_HELP
    echo.
    echo NAME
    echo     %SCRIPT_NAME% - Database backup utility
    echo.
    echo SYNOPSIS
    echo     %SCRIPT_NAME% [OPTIONS] [DATABASE...]
    echo.
    echo DESCRIPTION
    echo     Performs MySQL database backups with compression and verification.
    echo.
    echo OPTIONS
    echo     /h, /?, --help      Show this help message
    echo     /v, --version       Show script version
    echo     /u:USER             Database user (default: %DEFAULT_USER%)
    echo     /p                  Prompt for database password
    echo     /H:HOST             Database host (default: %DEFAULT_HOST%)
    echo     /P:PORT             Database port (default: %DEFAULT_PORT%)
    echo     /o:DIR              Output directory (default: %BACKUP_DIR%)
    echo     /l:FILE             Log output to file
    echo     /c:FILE             Use specific config file
    echo     --dry-run           Show what would be done without executing
    echo     --verbose           Enable verbose output
    echo     --no-color          Disable colored output (not fully supported in CMD)
    echo.
    echo EXAMPLES
    echo     REM Backup all databases
    echo     %SCRIPT_NAME%
    echo.
    echo     REM Backup specific databases
    echo     %SCRIPT_NAME% mydb1 mydb2
    echo.
    echo     REM Backup with custom output directory
    echo     %SCRIPT_NAME% /o:D:\custom\backup\path
    echo.
    echo     REM Backup with logging
    echo     %SCRIPT_NAME% /l:backup.log
    echo.
    echo CONFIGURATION
    echo     Config file: %CONFIG_FILE%
    echo     Create from template: copy "%SCRIPT_NAME:.bat=%.config.template" "%SCRIPT_NAME:.bat=%.config"
    echo.
    echo AUTHOR
    echo     Written by Your Team
    echo.
    echo REPORTING BUGS
    echo     Report bugs to: bugs@example.com
    echo.
    echo COPYRIGHT
    echo     Copyright (C) 2025 Your Organization
    echo     License: MIT
    echo.
    exit /b 0

:: ✅ Good - Version function
:SHOW_VERSION
    echo %SCRIPT_NAME% version %SCRIPT_VERSION%
    echo Copyright (C) 2025 Your Organization
    exit /b 0
```

### Argument Parsing Pattern
```batch
:: ✅ Good - Robust argument parsing
:PARSE_ARGUMENTS
    set "DATABASES="
    set "LOG_FILE="
    set "VERBOSE=false"
    set "DRY_RUN=false"
    set "NO_COLOR=false"
    set "SHOW_HELP=false"
    
    :: Check for no arguments
    if "%~1"=="" (
        echo [INFO] No arguments provided. Use /? or --help for usage information.
    )
    
    :PARSE_LOOP
    if "%~1"=="" goto :END_PARSE
    
    set "ARG=%~1"
    
    :: Check for help
    if /i "%ARG%"=="/?" set "SHOW_HELP=true" & goto :NEXT_ARG
    if /i "%ARG%"=="/h" set "SHOW_HELP=true" & goto :NEXT_ARG
    if /i "%ARG%"=="--help" set "SHOW_HELP=true" & goto :NEXT_ARG
    
    :: Check for version
    if /i "%ARG%"=="/v" call :SHOW_VERSION & exit /b 0
    if /i "%ARG%"=="--version" call :SHOW_VERSION & exit /b 0
    
    :: Check for user
    if /i "%ARG:~0,3%"=="/u:" (
        set "DB_USER=%ARG:~3%"
        if "!DB_USER!"=="" (
            echo [ERROR] /u: requires a username >&2
            call :SHOW_HELP
            exit /b 1
        )
        goto :NEXT_ARG
    )
    
    :: Check for password prompt
    if /i "%ARG%"=="/p" (
        set /p "DB_PASSWORD=Enter password: "
        goto :NEXT_ARG
    )
    
    :: Check for host
    if /i "%ARG:~0,3%"=="/H:" (
        set "DB_HOST=%ARG:~3%"
        if "!DB_HOST!"=="" (
            echo [ERROR] /H: requires a hostname >&2
            call :SHOW_HELP
            exit /b 1
        )
        goto :NEXT_ARG
    )
    
    :: Check for port
    if /i "%ARG:~0,3%"=="/P:" (
        set "DB_PORT=%ARG:~3%"
        echo !DB_PORT! | findstr /r "^[0-9][0-9]*$" >nul
        if !ERRORLEVEL! NEQ 0 (
            echo [ERROR] /P: requires a numeric port >&2
            call :SHOW_HELP
            exit /b 1
        )
        goto :NEXT_ARG
    )
    
    :: Check for output directory
    if /i "%ARG:~0,3%"=="/o:" (
        set "BACKUP_DIR=%ARG:~3%"
        if "!BACKUP_DIR!"=="" (
            echo [ERROR] /o: requires a directory path >&2
            call :SHOW_HELP
            exit /b 1
        )
        goto :NEXT_ARG
    )
    
    :: Check for log file
    if /i "%ARG:~0,3%"=="/l:" (
        set "LOG_FILE=%ARG:~3%"
        if "!LOG_FILE!"=="" (
            :: Auto-generate log filename
            for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
            set "LOG_FILE=%LOG_DIR%\%SCRIPT_NAME:.bat=%_!dt:~0,4!-!dt:~4,2!-!dt:~6,2!-!dt:~8,2!-!dt:~10,2!-!dt:~12,2!.log"
        )
        goto :NEXT_ARG
    )
    
    :: Check for config file
    if /i "%ARG:~0,3%"=="/c:" (
        set "CONFIG_FILE=%ARG:~3%"
        if not exist "!CONFIG_FILE!" (
            echo [ERROR] Config file not found: !CONFIG_FILE! >&2
            call :SHOW_HELP
            exit /b 1
        )
        call "!CONFIG_FILE!"
        goto :NEXT_ARG
    )
    
    :: Check for flags
    if /i "%ARG%"=="--dry-run" set "DRY_RUN=true" & goto :NEXT_ARG
    if /i "%ARG%"=="--verbose" set "VERBOSE=true" & goto :NEXT_ARG
    if /i "%ARG%"=="--no-color" set "NO_COLOR=true" & goto :NEXT_ARG
    
    :: Unknown option check
    if "%ARG:~0,1%"=="/" (
        echo [ERROR] Unknown option: %ARG% >&2
        call :SHOW_HELP
        exit /b 1
    )
    if "%ARG:~0,2%"=="--" (
        echo [ERROR] Unknown option: %ARG% >&2
        call :SHOW_HELP
        exit /b 1
    )
    
    :: Assume it's a database name
    if defined DATABASES (
        set "DATABASES=%DATABASES% %ARG%"
    ) else (
        set "DATABASES=%ARG%"
    )
    
    :NEXT_ARG
    shift
    goto :PARSE_LOOP
    
    :END_PARSE
    
    :: Show help if requested
    if "%SHOW_HELP%"=="true" (
        call :SHOW_HELP
        exit /b 0
    )
    
    :: Validate arguments
    call :VALIDATE_ARGUMENTS
    exit /b %ERRORLEVEL%

:VALIDATE_ARGUMENTS
    :: Check for required tools
    if not exist "%MYSQL_BIN%" (
        echo [ERROR] Required tool not found: %MYSQL_BIN% >&2
        exit /b 1
    )
    if not exist "%MYSQLDUMP_BIN%" (
        echo [ERROR] Required tool not found: %MYSQLDUMP_BIN% >&2
        exit /b 1
    )
    
    :: Check output directory
    if not exist "%BACKUP_DIR%" (
        echo [WARNING] Output directory does not exist: %BACKUP_DIR%
        echo Creating directory...
        mkdir "%BACKUP_DIR%" 2>nul
        if !ERRORLEVEL! NEQ 0 (
            echo [ERROR] Failed to create output directory >&2
            exit /b 1
        )
    )
    
    :: Create log directory if needed
    if defined LOG_FILE (
        for %%F in ("%LOG_FILE%") do set "LOG_DIR_PATH=%%~dpF"
        if not exist "!LOG_DIR_PATH!" (
            mkdir "!LOG_DIR_PATH!" 2>nul
        )
    )
    
    exit /b 0
```

### Enhanced Logging with Icons
```batch
:: ✅ Good - Enhanced logging functions
:: Note: Windows CMD has limited support for colors and Unicode icons
:: Using ASCII alternatives and color codes where supported

:LOG_MESSAGE
    setlocal
    set "LEVEL=%~1"
    set "MESSAGE=%~2"
    
    :: Get timestamp
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2% %dt:~8,2%:%dt:~10,2%:%dt:~12,2%"
    set "LOG_ENTRY=[%TIMESTAMP%] [%LEVEL%] %MESSAGE%"
    
    :: Console output with icons (ASCII alternatives for better compatibility)
    if /i "%LEVEL%"=="SUCCESS" (
        echo [OK] %MESSAGE%
    ) else if /i "%LEVEL%"=="ERROR" (
        echo [ERROR] %MESSAGE% >&2
    ) else if /i "%LEVEL%"=="WARNING" (
        echo [WARN] %MESSAGE%
    ) else if /i "%LEVEL%"=="INFO" (
        echo [INFO] %MESSAGE%
    ) else if /i "%LEVEL%"=="RUNNING" (
        echo [RUN] %MESSAGE%
    ) else if /i "%LEVEL%"=="DEBUG" (
        if "%VERBOSE%"=="true" (
            echo [DEBUG] %MESSAGE%
        )
    ) else (
        echo %MESSAGE%
    )
    
    :: File logging (if enabled)
    if defined LOG_FILE (
        echo %LOG_ENTRY% >> "%LOG_FILE%"
    )
    
    endlocal
    exit /b 0

:: Convenience functions
:LOG_SUCCESS
    call :LOG_MESSAGE "SUCCESS" "%~1"
    exit /b 0

:LOG_ERROR
    call :LOG_MESSAGE "ERROR" "%~1"
    exit /b 0

:LOG_WARNING
    call :LOG_MESSAGE "WARNING" "%~1"
    exit /b 0

:LOG_INFO
    call :LOG_MESSAGE "INFO" "%~1"
    exit /b 0

:LOG_RUNNING
    call :LOG_MESSAGE "RUNNING" "%~1"
    exit /b 0

:LOG_DEBUG
    call :LOG_MESSAGE "DEBUG" "%~1"
    exit /b 0

:: ✅ Good - Progress indicator
:SHOW_PROGRESS
    setlocal EnableDelayedExpansion
    set /a "CURRENT=%~1"
    set /a "TOTAL=%~2"
    set "TASK=%~3"
    set /a "PERCENT=CURRENT*100/TOTAL"
    
    :: Build progress bar
    set "BAR="
    set /a "FILLED=PERCENT/2"
    for /l %%i in (1,1,50) do (
        if %%i LEQ !FILLED! (
            set "BAR=!BAR!#"
        ) else (
            set "BAR=!BAR!-"
        )
    )
    
    :: Display progress (use <CR> to overwrite line)
    <nul set /p "=[RUN] Progress: [!BAR!] !PERCENT!%% - !TASK!    "
    
    if %CURRENT% EQU %TOTAL% (
        echo.
        echo [OK] Progress: [##################################################] 100%% - Complete!
    )
    
    endlocal
    exit /b 0
```

### Script Completion Pattern
```batch
:: ✅ Good - Cleanup and exit handling
:CLEANUP
    set "EXIT_CODE=%~1"
    if not defined EXIT_CODE set "EXIT_CODE=%ERRORLEVEL%"
    
    call :LOG_DEBUG "Performing cleanup..."
    
    :: Remove temporary files
    if defined TEMP_DIR if exist "%TEMP_DIR%" (
        rmdir /s /q "%TEMP_DIR%" 2>nul
    )
    
    :: Calculate execution time
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "END_TIME=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%.%dt:~8,2%.%dt:~10,2%.%dt:~12,2%"
    
    :: Calculate duration (simplified - for accurate calculation use PowerShell)
    if defined START_TIME (
        echo [INFO] Start time: %START_TIME%
        echo [INFO] End time: %END_TIME%
    )
    
    :: Final status message
    if "%EXIT_CODE%"=="0" (
        call :LOG_SUCCESS "Script completed successfully"
    ) else (
        call :LOG_ERROR "Script failed with exit code: %EXIT_CODE%"
    )
    
    echo [STOP] Script %SCRIPT_NAME% finished at %END_TIME%
    
    :: Close log file if open
    if defined LOG_FILE (
        echo Log saved to: %LOG_FILE%
    )
    
    endlocal
    exit /b %EXIT_CODE%

:: ✅ Good - Main function pattern
:MAIN
    :: Parse arguments
    call :PARSE_ARGUMENTS %*
    if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
    
    :: Validate environment
    call :VALIDATE_ARGUMENTS
    if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
    
    :: Start main logic
    call :LOG_INFO "Starting main process..."
    
    :: Your main logic here
    if "%DRY_RUN%"=="true" (
        call :LOG_WARNING "DRY RUN MODE - No actual changes will be made"
    )
    
    :: Example task with progress
    set /a "TOTAL_TASKS=10"
    for /l %%i in (1,1,%TOTAL_TASKS%) do (
        call :SHOW_PROGRESS %%i %TOTAL_TASKS% "Processing task %%i"
        :: Simulate work
        timeout /t 1 /nobreak >nul 2>&1
    )
    
    call :LOG_SUCCESS "All tasks completed successfully"
    
    :: Cleanup and exit
    call :CLEANUP 0
    exit /b 0

:: Entry point
call :MAIN %*
exit /b %ERRORLEVEL%
```

### Configuration File Template
```batch
:: ✅ Good - Configuration file template
:: Create template file
:CREATE_CONFIG_TEMPLATE
    set "TEMPLATE_FILE=%SCRIPT_NAME:.bat=%.config.template"
    (
        echo @echo off
        echo :: Configuration file for %SCRIPT_NAME%
        echo :: Copy this file to %SCRIPT_NAME:.bat=%.config and customize values
        echo.
        echo :: Database settings
        echo set "DB_USER=admin"
        echo set "DB_HOST=localhost"
        echo set "DB_PORT=3306"
        echo set "DB_NAME=mydb"
        echo.
        echo :: Paths ^(use absolute paths^)
        echo set "BACKUP_DIR=C:\backup"
        echo set "LOG_DIR=C:\logs"
        echo set "TEMP_DIR=%TEMP%"
        echo.
        echo :: Tool paths
        echo set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
        echo set "MYSQLDUMP_BIN=C:\xampp\mysql\bin\mysqldump.exe"
        echo.
        echo :: Options
        echo set "COMPRESSION=gzip"  :: Options: gzip, 7z, zip, none
        echo set "RETENTION_DAYS=30"  :: Days to keep backups
        echo set "PARALLEL_JOBS=4"    :: Number of parallel jobs
        echo set "VERBOSE=false"      :: Enable verbose output
        echo set "NO_COLOR=false"     :: Disable colored output
        echo.
        echo :: Email notifications ^(optional^)
        echo set "EMAIL_TO="
        echo set "EMAIL_FROM="
        echo set "EMAIL_ON_SUCCESS=false"
        echo set "EMAIL_ON_FAILURE=true"
        echo.
        echo :: Custom settings
        echo :: Add your custom settings here
    ) > "%TEMPLATE_FILE%"
    echo Configuration template created: %TEMPLATE_FILE%
    exit /b 0
```

### Complete Script Template
```batch
@echo off
:: ✅ Good - Complete script template following all guidelines
setlocal EnableDelayedExpansion
setlocal EnableExtensions

:: Script metadata
set "SCRIPT_NAME=%~nx0"
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_VERSION=1.0.0"

:: Enable UTF-8
chcp 65001 >nul 2>&1

:: Start timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "START_TIME=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%.%dt:~8,2%.%dt:~10,2%.%dt:~12,2%"
echo [START] Script %SCRIPT_NAME% starts at %START_TIME%

:: Initialize constants AFTER start message
set "TOOL_BIN=C:\Program Files\Tool\tool.exe"
set "OUTPUT_DIR=C:\output"
set "LOG_DIR=C:\logs"

:: Load config if exists
set "CONFIG_FILE=%SCRIPT_DIR%%SCRIPT_NAME:.bat=%.config"
if exist "%CONFIG_FILE%" (
    echo [CONFIG] Loading settings from %CONFIG_FILE%
    call "%CONFIG_FILE%"
) else (
    echo [INFO] Using default settings
)

:: Main execution
goto :MAIN

:: [Include all functions defined above]

:MAIN
    call :PARSE_ARGUMENTS %*
    if %ERRORLEVEL% NEQ 0 goto :EOF
    
    :: Your main logic here
    call :LOG_INFO "Executing main task..."
    
    :: Success
    call :CLEANUP 0
    goto :EOF

:EOF
endlocal
exit /b %ERRORLEVEL%
```

## Final Checklist

### BAT/CMD Script Quality Checklist
- [ ] `@echo off` at script start
- [ ] `setlocal` to prevent environment pollution
- [ ] Start message with timestamp
- [ ] Constants initialized in UPPERCASE after start message
- [ ] Full paths for all executables in variables
- [ ] Configuration file support with automatic loading
- [ ] Comprehensive help system (/?, /h, --help)
- [ ] Argument validation with clear error messages
- [ ] Icon-enhanced output (ASCII alternatives for compatibility)
- [ ] Progress indicators for long operations
- [ ] Logging to file support (automatic filename generation)
- [ ] Finish message with timestamp
- [ ] All variables properly quoted
- [ ] Input validation implemented
- [ ] Error handling with meaningful messages
- [ ] ERRORLEVEL checked after commands
- [ ] Cleanup routines for temporary resources
- [ ] Local variables with setlocal/endlocal
- [ ] Consistent naming conventions
- [ ] Proper exit codes used
- [ ] Script tested on target Windows versions
- [ ] Documentation for complex functions
- [ ] Security considerations addressed
- [ ] PowerShell integration for complex tasks where appropriate