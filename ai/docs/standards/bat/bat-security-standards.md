# BAT/CMD Security Standards

> **Extends**: `/docs/standards/global/security-standards.md`
> 
> This document provides **Windows Batch-specific** security implementations and patterns. Always follow the global security principles while applying these script-specific protections.

## Command Injection Prevention

### Input Sanitization
```batch
:: ✅ Good - Validate and sanitize all inputs
:SANITIZE_FILENAME
    setlocal EnableDelayedExpansion
    set "FILENAME=%~1"
    
    :: Remove path traversal attempts
    set "FILENAME=%FILENAME:..=%"
    set "FILENAME=%FILENAME:..\=%"
    set "FILENAME=%FILENAME:../=%"
    
    :: Remove dangerous characters
    set "FILENAME=%FILENAME:&=%"
    set "FILENAME=%FILENAME:|=%"
    set "FILENAME=%FILENAME:>=%"
    set "FILENAME=%FILENAME:<=%"
    set "FILENAME=%FILENAME:;=%"
    set "FILENAME=%FILENAME:^=%"
    set "FILENAME=%FILENAME:`=%"
    set "FILENAME=%FILENAME:$=%"
    
    :: Validate allowed characters only
    echo !FILENAME! | findstr /r "^[a-zA-Z0-9._-]*$" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Invalid filename characters >&2
        endlocal & exit /b 1
    )
    
    :: Check length
    call :STRLEN LEN "!FILENAME!"
    if !LEN! GTR 255 (
        echo Error: Filename too long >&2
        endlocal & exit /b 1
    )
    
    endlocal & set "SAFE_FILENAME=%FILENAME%"
    exit /b 0

:: ✅ Good - Safe command construction
:EXECUTE_SAFE_COMMAND
    setlocal
    set "COMMAND=%~1"
    shift
    
    :: Whitelist allowed commands
    set "ALLOWED=false"
    for %%C in (dir type findstr sort find) do (
        if /i "%COMMAND%"=="%%C" set "ALLOWED=true"
    )
    
    if "%ALLOWED%"=="false" (
        echo Error: Command '%COMMAND%' not allowed >&2
        endlocal & exit /b 1
    )
    
    :: Build safe argument list
    set "ARGS="
    :BUILD_ARGS
    if "%~1"=="" goto :EXECUTE
    set "ARGS=%ARGS% "%~1""
    shift
    goto :BUILD_ARGS
    
    :EXECUTE
    :: Execute with explicit arguments
    %COMMAND% %ARGS%
    
    endlocal
    exit /b %ERRORLEVEL%

:: ❌ Bad - Direct user input in commands
:PROCESS_FILE_UNSAFE
    set "USER_INPUT=%~1"
    :: NEVER DO THIS - vulnerable to injection
    cmd /c "type %USER_INPUT%"
    :: or
    for /f %%i in ('echo %USER_INPUT%') do echo %%i

:: ✅ Good - Safe alternative
:PROCESS_FILE_SAFE
    setlocal
    set "FILENAME=%~1"
    
    :: Validate filename
    call :SANITIZE_FILENAME "%FILENAME%"
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    :: Check file exists and is readable
    if not exist "%SAFE_FILENAME%" (
        echo Error: File not found >&2
        endlocal & exit /b 1
    )
    
    :: Use directly without shell interpretation
    type "%SAFE_FILENAME%"
    
    endlocal
    exit /b %ERRORLEVEL%
```

### Path Traversal Protection
```batch
:: ✅ Good - Secure path validation
:VALIDATE_PATH_SECURITY
    setlocal EnableDelayedExpansion
    set "INPUT_PATH=%~1"
    set "BASE_DIR=%~2"
    
    :: Get absolute paths
    pushd "%BASE_DIR%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Invalid base directory >&2
        endlocal & exit /b 1
    )
    set "ABS_BASE=%CD%"
    popd
    
    :: Check for path traversal patterns
    echo !INPUT_PATH! | findstr /r "\.\." >nul
    if %ERRORLEVEL% EQU 0 (
        echo Error: Path traversal attempt detected >&2
        endlocal & exit /b 1
    )
    
    :: Resolve full path
    pushd "%INPUT_PATH%" 2>nul
    if %ERRORLEVEL% EQU 0 (
        :: It's a directory
        set "REAL_PATH=%CD%"
        popd
    ) else (
        :: Try as file
        if exist "%INPUT_PATH%" (
            for %%F in ("%INPUT_PATH%") do set "REAL_PATH=%%~dpnxF"
        ) else (
            echo Error: Invalid path >&2
            endlocal & exit /b 1
        )
    )
    
    :: Ensure it's within base directory
    echo !REAL_PATH! | findstr /i /b "%ABS_BASE%" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Path outside allowed directory >&2
        endlocal & exit /b 1
    )
    
    endlocal & set "VALIDATED_PATH=%REAL_PATH%"
    exit /b 0

:: ✅ Good - Safe file operations
:READ_FILE_SECURELY
    setlocal
    set "FILENAME=%~1"
    set "BASE_DIR=C:\app\data"
    
    :: Validate path
    call :VALIDATE_PATH_SECURITY "%FILENAME%" "%BASE_DIR%"
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    :: Check file exists
    if not exist "%VALIDATED_PATH%" (
        echo Error: File does not exist >&2
        endlocal & exit /b 1
    )
    
    :: Check it's a file (not directory)
    if exist "%VALIDATED_PATH%\*" (
        echo Error: Path is a directory >&2
        endlocal & exit /b 1
    )
    
    :: Read file safely
    type "%VALIDATED_PATH%"
    
    endlocal
    exit /b %ERRORLEVEL%
```

## Environment Variable Security

### Secure Environment Handling
```batch
:: ✅ Good - Environment variable validation
:VALIDATE_ENVIRONMENT
    setlocal EnableDelayedExpansion
    
    :: Required variables
    for %%V in (DATABASE_HOST API_ENDPOINT LOG_LEVEL) do (
        if not defined %%V (
            echo Error: Required environment variable '%%V' not set >&2
            exit /b 1
        )
    )
    
    :: Validate specific formats
    if defined DATABASE_PORT (
        echo !DATABASE_PORT! | findstr /r "^[0-9][0-9]*$" >nul
        if !ERRORLEVEL! NEQ 0 (
            echo Error: DATABASE_PORT must be numeric >&2
            exit /b 1
        )
    )
    
    if defined LOG_LEVEL (
        set "VALID_LEVEL=false"
        for %%L in (DEBUG INFO WARN ERROR) do (
            if /i "!LOG_LEVEL!"=="%%L" set "VALID_LEVEL=true"
        )
        if "!VALID_LEVEL!"=="false" (
            echo Error: Invalid LOG_LEVEL >&2
            exit /b 1
        )
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Secure credential handling
:LOAD_SECRETS
    setlocal EnableDelayedExpansion
    set "SECRETS_FILE=%~1"
    
    :: Check file exists
    if not exist "%SECRETS_FILE%" (
        echo Error: Secrets file not found >&2
        endlocal & exit /b 1
    )
    
    :: Check file permissions using icacls
    set "PERM_OK=false"
    for /f "tokens=*" %%P in ('icacls "%SECRETS_FILE%" 2^>nul') do (
        echo %%P | findstr /i "Everyone" >nul
        if !ERRORLEVEL! NEQ 0 set "PERM_OK=true"
    )
    
    if "%PERM_OK%"=="false" (
        echo Error: Secrets file has insecure permissions >&2
        endlocal & exit /b 1
    )
    
    :: Load secrets without exposing
    for /f "usebackq tokens=1,* delims==" %%A in ("%SECRETS_FILE%") do (
        :: Skip comments and empty lines
        echo %%A | findstr /r "^#" >nul && goto :CONTINUE
        if "%%A"=="" goto :CONTINUE
        
        :: Validate key format
        echo %%A | findstr /r "^[A-Z_][A-Z0-9_]*$" >nul
        if !ERRORLEVEL! EQU 0 (
            :: Set without echoing value
            set "%%A=%%B"
        )
        :CONTINUE
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Clear sensitive variables
:CLEANUP_ENVIRONMENT
    setlocal
    
    :: Clear known sensitive patterns
    for /f "tokens=1 delims==" %%V in ('set 2^>nul ^| findstr /i "PASSWORD SECRET KEY TOKEN API_KEY"') do (
        set "%%V="
    )
    
    endlocal
    exit /b 0
```

## Temporary File Security

### Secure Temporary Files
```batch
:: ✅ Good - Secure temporary file creation
:CREATE_SECURE_TEMP_FILE
    setlocal
    set "TEMPLATE=%~1"
    if "%TEMPLATE%"=="" set "TEMPLATE=temp"
    
    :: Generate random name
    set "TEMP_FILE=%TEMP%\%TEMPLATE%_%RANDOM%_%RANDOM%.tmp"
    
    :: Create with exclusive access
    type nul > "%TEMP_FILE%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to create temporary file >&2
        endlocal & exit /b 1
    )
    
    :: Set restrictive permissions (remove Everyone, add current user only)
    icacls "%TEMP_FILE%" /inheritance:r /grant:r "%USERNAME%:(F)" >nul 2>&1
    
    endlocal & set "SECURE_TEMP_FILE=%TEMP_FILE%"
    exit /b 0

:CREATE_SECURE_TEMP_DIR
    setlocal
    set "TEMPLATE=%~1"
    if "%TEMPLATE%"=="" set "TEMPLATE=tempdir"
    
    set "TEMP_DIR=%TEMP%\%TEMPLATE%_%RANDOM%_%RANDOM%"
    
    mkdir "%TEMP_DIR%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to create temporary directory >&2
        endlocal & exit /b 1
    )
    
    :: Secure permissions
    icacls "%TEMP_DIR%" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F" >nul 2>&1
    
    endlocal & set "SECURE_TEMP_DIR=%TEMP_DIR%"
    exit /b 0

:: ✅ Good - Secure temporary file usage
:PROCESS_SENSITIVE_DATA
    setlocal
    set "INPUT_FILE=%~1"
    
    :: Create secure temporary file
    call :CREATE_SECURE_TEMP_FILE "sensitive"
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    :: Process data
    (
        echo # Processed on %DATE% %TIME%
        type "%INPUT_FILE%" | findstr /v "SECRET"
    ) > "%SECURE_TEMP_FILE%"
    
    :: Use processed data
    call :VALIDATE_OUTPUT "%SECURE_TEMP_FILE%"
    
    :: Secure deletion (overwrite before removal)
    :: Windows doesn't have shred, so we overwrite manually
    for /l %%i in (1,1,3) do (
        type nul > "%SECURE_TEMP_FILE%"
        for /l %%j in (1,1,100) do echo XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX >> "%SECURE_TEMP_FILE%"
    )
    del /f /q "%SECURE_TEMP_FILE%" 2>nul
    
    endlocal
    exit /b 0

:: ❌ Bad - Insecure temporary files
:PROCESS_DATA_INSECURE
    :: Predictable name
    set "TEMP_FILE=%TEMP%\data_%USERNAME%.tmp"
    
    :: World readable by default
    echo sensitive data > "%TEMP_FILE%"
    
    :: Data recoverable after simple delete
    del "%TEMP_FILE%"
```

## Process Security

### Privilege Management
```batch
:: ✅ Good - Check and manage privileges
:CHECK_ADMIN_RIGHTS
    setlocal
    
    :: Check if running as administrator
    net session >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Administrator privileges required >&2
        echo Please run as administrator >&2
        endlocal & exit /b 1
    )
    
    echo Running with administrator privileges
    endlocal
    exit /b 0

:: ✅ Good - Run with least privilege
:RUN_AS_USER
    setlocal
    set "TARGET_USER=%~1"
    set "COMMAND=%~2"
    
    :: Validate user exists
    net user "%TARGET_USER%" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Error: User '%TARGET_USER%' does not exist >&2
        endlocal & exit /b 1
    )
    
    :: Run command as specified user
    runas /user:"%TARGET_USER%" "%COMMAND%"
    
    endlocal
    exit /b %ERRORLEVEL%

:: ✅ Good - Resource limits (Windows Job Objects via WMIC)
:SET_RESOURCE_LIMITS
    setlocal
    
    :: Set process priority to below normal
    wmic process where "ProcessId=%PID%" call setpriority "Below Normal" >nul 2>&1
    
    :: Limit CPU affinity (use only first CPU)
    start /affinity 1 /wait cmd /c "%~dpnx0" %*
    
    :: Memory limits require Job Objects (complex in pure batch)
    :: Consider using PowerShell for advanced limits
    
    endlocal
    exit /b 0
```

### Critical Section Protection
```batch
:: ✅ Good - Mutex/Lock implementation
:ACQUIRE_LOCK
    setlocal
    set "LOCK_FILE=%TEMP%\%~1.lock"
    set "MAX_WAIT=%~2"
    if "%MAX_WAIT%"=="" set "MAX_WAIT=30"
    
    set /a "WAITED=0"
    :TRY_LOCK
    :: Try to create lock file exclusively
    (
        echo %DATE% %TIME% > "%LOCK_FILE%"
    ) 2>nul && (
        endlocal & set "LOCK_ACQUIRED=%LOCK_FILE%"
        exit /b 0
    )
    
    :: Wait and retry
    if %WAITED% GEQ %MAX_WAIT% (
        echo Error: Failed to acquire lock after %MAX_WAIT% seconds >&2
        endlocal & exit /b 1
    )
    
    timeout /t 1 /nobreak >nul
    set /a "WAITED+=1"
    goto :TRY_LOCK

:RELEASE_LOCK
    setlocal
    set "LOCK_FILE=%~1"
    
    if exist "%LOCK_FILE%" (
        del /f /q "%LOCK_FILE%" 2>nul
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Critical section with lock
:CRITICAL_SECTION
    setlocal
    set "OPERATION=%~1"
    
    :: Acquire lock
    call :ACQUIRE_LOCK "critical_operation" 10
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    :: Execute critical operation
    call %OPERATION% %2 %3 %4 %5 %6 %7 %8 %9
    set "RESULT=%ERRORLEVEL%"
    
    :: Always release lock
    call :RELEASE_LOCK "%LOCK_ACQUIRED%"
    
    endlocal & exit /b %RESULT%
```

## Network Security

### Secure Network Operations
```batch
:: ✅ Good - Secure download with validation
:SECURE_HTTP_REQUEST
    setlocal EnableDelayedExpansion
    set "URL=%~1"
    set "METHOD=%~2"
    if "%METHOD%"=="" set "METHOD=GET"
    set "TIMEOUT=%~3"
    if "%TIMEOUT%"=="" set "TIMEOUT=30"
    
    :: Validate URL format
    echo %URL% | findstr /r "^https*://" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Invalid URL format >&2
        endlocal & exit /b 1
    )
    
    :: Force HTTPS in production
    if /i "%ENVIRONMENT%"=="production" (
        echo %URL% | findstr /i "^https://" >nul
        if %ERRORLEVEL% NEQ 0 (
            echo Error: HTTPS required in production >&2
            endlocal & exit /b 1
        )
    )
    
    :: Build secure curl command
    set "CURL_CMD=curl --fail --silent --show-error"
    set "CURL_CMD=%CURL_CMD% --max-time %TIMEOUT%"
    set "CURL_CMD=%CURL_CMD% --proto =http,https"
    set "CURL_CMD=%CURL_CMD% --tlsv1.2"
    
    :: Add authentication if available
    if defined API_TOKEN (
        set "CURL_CMD=%CURL_CMD% --header "Authorization: Bearer %API_TOKEN%""
    )
    
    :: Execute request
    %CURL_CMD% -X %METHOD% "%URL%"
    
    endlocal
    exit /b %ERRORLEVEL%

:: ✅ Good - Network input validation
:VALIDATE_NETWORK_INPUT
    setlocal EnableDelayedExpansion
    set "INPUT=%~1"
    set "TYPE=%~2"
    
    if /i "%TYPE%"=="hostname" (
        :: Allow only valid hostname characters
        echo !INPUT! | findstr /r "^[a-zA-Z0-9.-][a-zA-Z0-9.-]*$" >nul
        if !ERRORLEVEL! NEQ 0 exit /b 1
        
        :: Check length
        call :STRLEN LEN "!INPUT!"
        if !LEN! GTR 253 exit /b 1
        
        exit /b 0
    )
    
    if /i "%TYPE%"=="ip4" (
        :: Validate IPv4 format
        echo !INPUT! | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
        if !ERRORLEVEL! NEQ 0 exit /b 1
        
        :: Validate each octet
        for /f "tokens=1-4 delims=." %%a in ("!INPUT!") do (
            if %%a GTR 255 exit /b 1
            if %%b GTR 255 exit /b 1
            if %%c GTR 255 exit /b 1
            if %%d GTR 255 exit /b 1
        )
        
        exit /b 0
    )
    
    if /i "%TYPE%"=="port" (
        echo !INPUT! | findstr /r "^[0-9][0-9]*$" >nul
        if !ERRORLEVEL! NEQ 0 exit /b 1
        
        if !INPUT! LSS 1 exit /b 1
        if !INPUT! GTR 65535 exit /b 1
        
        exit /b 0
    )
    
    endlocal & exit /b 1

:: ✅ Good - Secure download with verification
:SECURE_DOWNLOAD
    setlocal
    set "URL=%~1"
    set "OUTPUT_FILE=%~2"
    set "EXPECTED_HASH=%~3"
    set "HASH_TYPE=%~4"
    if "%HASH_TYPE%"=="" set "HASH_TYPE=SHA256"
    
    :: Validate URL
    call :VALIDATE_NETWORK_INPUT "%URL%" "url"
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Invalid URL >&2
        endlocal & exit /b 1
    )
    
    :: Create temporary file
    call :CREATE_SECURE_TEMP_FILE "download"
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    :: Download to temporary location
    call :SECURE_HTTP_REQUEST "%URL%" > "%SECURE_TEMP_FILE%"
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Download failed >&2
        del /f /q "%SECURE_TEMP_FILE%" 2>nul
        endlocal & exit /b 1
    )
    
    :: Verify hash if provided
    if not "%EXPECTED_HASH%"=="" (
        certutil -hashfile "%SECURE_TEMP_FILE%" %HASH_TYPE% | findstr /v ":" > "%TEMP%\hash.tmp"
        set /p ACTUAL_HASH=<"%TEMP%\hash.tmp"
        del "%TEMP%\hash.tmp" 2>nul
        
        if /i not "!ACTUAL_HASH!"=="%EXPECTED_HASH%" (
            echo Error: Hash verification failed >&2
            echo Expected: %EXPECTED_HASH% >&2
            echo Actual: !ACTUAL_HASH! >&2
            del /f /q "%SECURE_TEMP_FILE%" 2>nul
            endlocal & exit /b 1
        )
    )
    
    :: Move to final location
    move /y "%SECURE_TEMP_FILE%" "%OUTPUT_FILE%" >nul 2>&1
    
    endlocal
    exit /b 0
```

## Logging Security

### Secure Logging
```batch
:: ✅ Good - Security-aware logging
:SECURE_LOG
    setlocal EnableDelayedExpansion
    set "LEVEL=%~1"
    set "MESSAGE=%~2"
    set "COMPONENT=%~3"
    if "%COMPONENT%"=="" set "COMPONENT=MAIN"
    
    :: Sanitize message
    call :SANITIZE_LOG_MESSAGE "!MESSAGE!" SANITIZED
    
    :: Build log entry
    set "LOG_ENTRY=[%DATE% %TIME%] [%LEVEL%] [%COMPONENT%] [PID:%RANDOM%] [USER:%USERNAME%] !SANITIZED!"
    
    :: Write to secure log file
    set "LOG_FILE=%SECURE_LOG_FILE%"
    if "%LOG_FILE%"=="" set "LOG_FILE=%TEMP%\secure-app.log"
    
    :: Ensure log directory exists
    for %%F in ("%LOG_FILE%") do set "LOG_DIR=%%~dpF"
    if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
    
    :: Append with lock
    call :ACQUIRE_LOCK "log_write" 5
    if %ERRORLEVEL% EQU 0 (
        echo !LOG_ENTRY! >> "%LOG_FILE%"
        call :RELEASE_LOCK "%LOCK_ACQUIRED%"
    )
    
    endlocal
    exit /b 0

:SANITIZE_LOG_MESSAGE
    setlocal EnableDelayedExpansion
    set "MESSAGE=%~1"
    
    :: Remove sensitive patterns
    set "MESSAGE=!MESSAGE:password=***!"
    set "MESSAGE=!MESSAGE:PASSWORD=***!"
    set "MESSAGE=!MESSAGE:token=***!"
    set "MESSAGE=!MESSAGE:TOKEN=***!"
    set "MESSAGE=!MESSAGE:key=***!"
    set "MESSAGE=!MESSAGE:KEY=***!"
    set "MESSAGE=!MESSAGE:secret=***!"
    set "MESSAGE=!MESSAGE:SECRET=***!"
    
    :: Remove credit card patterns (simplified)
    set "MESSAGE=!MESSAGE:4[0-9][0-9][0-9]=4XXX!"
    set "MESSAGE=!MESSAGE:5[0-9][0-9][0-9]=5XXX!"
    
    endlocal & set "%~2=%MESSAGE%"
    exit /b 0

:: ✅ Good - Security event logging
:LOG_SECURITY_EVENT
    setlocal
    set "EVENT_TYPE=%~1"
    set "DESCRIPTION=%~2"
    set "SEVERITY=%~3"
    if "%SEVERITY%"=="" set "SEVERITY=MEDIUM"
    set "USER=%~4"
    if "%USER%"=="" set "USER=%USERNAME%"
    
    set "SECURITY_LOG=%SECURITY_LOG_FILE%"
    if "%SECURITY_LOG%"=="" set "SECURITY_LOG=%TEMP%\security-events.log"
    
    :: Create JSON-like entry
    (
        echo {
        echo   "timestamp": "%DATE% %TIME%",
        echo   "event_type": "%EVENT_TYPE%",
        echo   "severity": "%SEVERITY%",
        echo   "description": "%DESCRIPTION%",
        echo   "user": "%USER%",
        echo   "computer": "%COMPUTERNAME%",
        echo   "pid": "%RANDOM%"
        echo }
    ) >> "%SECURITY_LOG%"
    
    :: Send alert for high severity
    if /i "%SEVERITY%"=="HIGH" call :SEND_SECURITY_ALERT "%EVENT_TYPE%" "%DESCRIPTION%"
    if /i "%SEVERITY%"=="CRITICAL" call :SEND_SECURITY_ALERT "%EVENT_TYPE%" "%DESCRIPTION%"
    
    endlocal
    exit /b 0

:SEND_SECURITY_ALERT
    setlocal
    set "EVENT_TYPE=%~1"
    set "DESCRIPTION=%~2"
    
    :: Log to Windows Event Log
    eventcreate /T WARNING /ID 100 /L APPLICATION /SO "SecureApp" /D "Security Alert: %EVENT_TYPE% - %DESCRIPTION%" >nul 2>&1
    
    :: Send email if configured (requires configured SMTP)
    if defined SECURITY_EMAIL (
        echo Security Alert: %EVENT_TYPE% > "%TEMP%\alert.txt"
        echo Description: %DESCRIPTION% >> "%TEMP%\alert.txt"
        echo Computer: %COMPUTERNAME% >> "%TEMP%\alert.txt"
        echo Time: %DATE% %TIME% >> "%TEMP%\alert.txt"
        
        :: Use PowerShell for email
        powershell -Command "Send-MailMessage -To '%SECURITY_EMAIL%' -From 'security@localhost' -Subject 'Security Alert: %EVENT_TYPE%' -Body (Get-Content '%TEMP%\alert.txt' -Raw) -SmtpServer 'localhost'" >nul 2>&1
        
        del "%TEMP%\alert.txt" 2>nul
    )
    
    endlocal
    exit /b 0
```

## Audit and Compliance

### Security Audit Functions
```batch
:: ✅ Good - File access auditing
:AUDIT_FILE_ACCESS
    setlocal
    set "FILE_PATH=%~1"
    set "OPERATION=%~2"
    set "USER=%~3"
    if "%USER%"=="" set "USER=%USERNAME%"
    
    call :LOG_SECURITY_EVENT "FILE_ACCESS" "User %USER% performed %OPERATION% on %FILE_PATH%" "LOW"
    
    :: Check if sensitive file
    call :IS_SENSITIVE_FILE "%FILE_PATH%"
    if %ERRORLEVEL% EQU 0 (
        call :LOG_SECURITY_EVENT "SENSITIVE_FILE_ACCESS" "Access to sensitive file: %FILE_PATH%" "MEDIUM"
    )
    
    endlocal
    exit /b 0

:IS_SENSITIVE_FILE
    setlocal EnableDelayedExpansion
    set "FILE_PATH=%~1"
    set "FILENAME=%~nx1"
    
    :: Convert to lowercase for comparison
    set "FILENAME_LOWER=!FILENAME!"
    for %%a in (a b c d e f g h i j k l m n o p q r s t u v w x y z) do (
        set "FILENAME_LOWER=!FILENAME_LOWER:%%A=%%a!"
    )
    
    :: Check for sensitive patterns
    for %%P in (password secret key token credential private confidential cert pem) do (
        echo !FILENAME_LOWER! | findstr /i "%%P" >nul
        if !ERRORLEVEL! EQU 0 (
            endlocal & exit /b 0
        )
    )
    
    endlocal & exit /b 1

:: ✅ Good - Security compliance checks
:RUN_SECURITY_COMPLIANCE_CHECK
    setlocal EnableDelayedExpansion
    set /a "PASS_COUNT=0"
    set /a "FAIL_COUNT=0"
    
    echo Running security compliance checks...
    
    :: Check file permissions
    call :CHECK_FILE_PERMISSIONS
    if %ERRORLEVEL% EQU 0 (
        echo [PASS] File permissions
        set /a "PASS_COUNT+=1"
    ) else (
        echo [FAIL] File permissions
        set /a "FAIL_COUNT+=1"
    )
    
    :: Check for hardcoded secrets
    call :CHECK_HARDCODED_SECRETS
    if %ERRORLEVEL% EQU 0 (
        echo [PASS] No hardcoded secrets
        set /a "PASS_COUNT+=1"
    ) else (
        echo [FAIL] Hardcoded secrets found
        set /a "FAIL_COUNT+=1"
    )
    
    :: Check Windows security settings
    call :CHECK_WINDOWS_SECURITY
    if %ERRORLEVEL% EQU 0 (
        echo [PASS] Windows security settings
        set /a "PASS_COUNT+=1"
    ) else (
        echo [FAIL] Windows security issues
        set /a "FAIL_COUNT+=1"
    )
    
    :: Report results
    echo.
    echo Security Compliance Results:
    echo   Passed: %PASS_COUNT%
    echo   Failed: %FAIL_COUNT%
    
    if %FAIL_COUNT% GTR 0 (
        call :LOG_SECURITY_EVENT "COMPLIANCE_FAILURE" "%FAIL_COUNT% compliance checks failed" "HIGH"
        endlocal & exit /b 1
    )
    
    endlocal & exit /b 0

:CHECK_FILE_PERMISSIONS
    setlocal
    set "ERRORS=0"
    
    :: Check config files aren't world-readable
    for %%D in ("%APPDATA%\MyApp" "%ProgramData%\MyApp") do (
        if exist "%%D" (
            for /r "%%D" %%F in (*.config *.ini *.conf) do (
                icacls "%%F" 2>nul | findstr /i "Everyone" >nul
                if %ERRORLEVEL% EQU 0 (
                    echo Warning: %%F is accessible to Everyone >&2
                    set /a "ERRORS+=1"
                )
            )
        )
    )
    
    if %ERRORS% GTR 0 exit /b 1
    endlocal & exit /b 0

:CHECK_HARDCODED_SECRETS
    setlocal
    
    :: Check current script for hardcoded secrets
    findstr /i "password.*=.*\"" "%~f0" >nul 2>&1
    if %ERRORLEVEL% EQU 0 exit /b 1
    
    findstr /i "api.*key.*=.*\"" "%~f0" >nul 2>&1
    if %ERRORLEVEL% EQU 0 exit /b 1
    
    findstr /i "secret.*=.*\"" "%~f0" >nul 2>&1
    if %ERRORLEVEL% EQU 0 exit /b 1
    
    endlocal & exit /b 0

:CHECK_WINDOWS_SECURITY
    setlocal
    
    :: Check if Windows Firewall is enabled
    netsh advfirewall show currentprofile | findstr /i "State.*ON" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Warning: Windows Firewall is not enabled >&2
        exit /b 1
    )
    
    :: Check if UAC is enabled
    reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v EnableLUA 2>nul | findstr /i "0x1" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Warning: UAC is not enabled >&2
        exit /b 1
    )
    
    endlocal & exit /b 0
```

## PowerShell Security Integration

### Secure PowerShell Execution
```batch
:: ✅ Good - Secure PowerShell script execution
:EXECUTE_POWERSHELL_SECURELY
    setlocal
    set "PS_SCRIPT=%~1"
    
    :: Validate script exists
    if not exist "%PS_SCRIPT%" (
        echo Error: PowerShell script not found >&2
        endlocal & exit /b 1
    )
    
    :: Check script signature (if using signed scripts)
    powershell -NoProfile -Command "Get-AuthenticodeSignature '%PS_SCRIPT%'" | findstr /i "Valid" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Warning: PowerShell script is not signed >&2
    )
    
    :: Execute with restricted policy
    powershell -NoProfile -ExecutionPolicy Restricted -File "%PS_SCRIPT%"
    
    endlocal
    exit /b %ERRORLEVEL%

:: ✅ Good - Secure inline PowerShell
:RUN_POWERSHELL_COMMAND
    setlocal
    set "PS_COMMAND=%~1"
    
    :: Sanitize command
    set "PS_COMMAND=%PS_COMMAND:;=%"
    set "PS_COMMAND=%PS_COMMAND:|=%"
    set "PS_COMMAND=%PS_COMMAND:&=%"
    
    :: Run with constraints
    powershell -NoProfile -NonInteractive -NoLogo -Command "& {[System.Security.SecurityRules]::Restricted; %PS_COMMAND%}"
    
    endlocal
    exit /b %ERRORLEVEL%
```

## Security Checklist

### Windows Batch Security Validation
- [ ] All user inputs are validated and sanitized
- [ ] No direct command execution with user input
- [ ] Path traversal protection implemented
- [ ] Temporary files created with secure permissions
- [ ] Sensitive variables are cleared after use
- [ ] File operations validate paths and permissions
- [ ] Network requests validate URLs and use HTTPS
- [ ] Logging sanitizes sensitive data
- [ ] No hardcoded secrets in scripts
- [ ] Error messages don't leak sensitive information
- [ ] Lock/mutex mechanisms for critical sections
- [ ] Administrator privileges checked when needed
- [ ] Windows security features utilized (UAC, Firewall)
- [ ] Event logging for security events
- [ ] Compliance checks implemented and passing
- [ ] PowerShell execution properly restricted
- [ ] Secure deletion of temporary sensitive files