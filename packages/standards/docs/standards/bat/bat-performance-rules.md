# BAT/CMD Performance Rules

> **Extends**: `/docs/standards/global/performance-rules.md`
> 
> This document provides **Windows Batch-specific** performance optimizations and patterns. Apply these script-specific optimizations while following global performance principles.

## Built-in vs External Commands

### Prefer Native Commands
```batch
:: ✅ Good - Use native CMD operations
set "FILENAME=%~nx1"          :: Instead of: for /f %%i in ('basename %1') do set FILENAME=%%i
set "DIRECTORY=%~dp1"         :: Instead of: for /f %%i in ('dirname %1') do set DIRECTORY=%%i
set "EXTENSION=%~x1"          :: Instead of: complex string parsing
set "DRIVE=%~d1"              :: Instead of: string extraction

:: ✅ Good - String operations with variable expansion
set "TEXT=Hello World"
set "UPPERCASE=%TEXT:a=A%"    :: Basic case conversion
set "REPLACED=%TEXT:World=Universe%"  :: Instead of: external sed/awk equivalents
set "TRIMMED=%TEXT: =%"       :: Remove spaces

:: ✅ Good - Length calculation without external tools
call :STRLEN LENGTH "%TEXT%"  :: Instead of: PowerShell or external tools

:: ✅ Good - Direct variable operations
set "CURRENT_DIR=%CD%"        :: Instead of: for /f %%i in ('cd') do set CURRENT_DIR=%%i
set "CURRENT_TIME=%TIME%"     :: Instead of: external time commands
```

### Avoid Unnecessary Process Creation
```batch
:: ✅ Good - Direct file operations
type file.txt > output.txt    :: Instead of: cmd /c type file.txt > output.txt

:: ✅ Good - Use built-in FOR loops
for %%F in (*.txt) do (
    echo Processing %%F
)
:: Instead of: dir /b *.txt | findstr .txt

:: ✅ Good - Direct variable assignment
set /a "RESULT=5*10+2"        :: Instead of: PowerShell calculations for simple math

:: ❌ Bad - Excessive subprocess creation
for /f %%i in ('echo %VAR%') do set NEW_VAR=%%i  :: Unnecessary
set "NEW_VAR=%VAR%"           :: Direct assignment is faster
```

## Efficient Loop Patterns

### File Processing Loops
```batch
:: ✅ Good - Efficient file processing
setlocal EnableDelayedExpansion
for %%F in ("%SOURCE_DIR%\*.txt") do (
    if exist "%%F" (
        set "FILE_SIZE=%%~zF"
        if !FILE_SIZE! GTR 0 (
            call :PROCESS_FILE "%%F"
        )
    )
)
endlocal

:: ✅ Good - Batch file operations
setlocal EnableDelayedExpansion
set "FILE_COUNT=0"
for %%F in (*.log) do (
    set /a "FILE_COUNT+=1"
    set "FILES[!FILE_COUNT!]=%%F"
)
:: Process all files at once
for /l %%i in (1,1,%FILE_COUNT%) do (
    echo Processing !FILES[%%i]!
)
endlocal

:: ✅ Good - Minimize disk I/O in loops
setlocal EnableDelayedExpansion
:: Read file once into memory
set "LINE_COUNT=0"
for /f "usebackq delims=" %%L in ("%INPUT_FILE%") do (
    set /a "LINE_COUNT+=1"
    set "LINE[!LINE_COUNT!]=%%L"
)
:: Process lines from memory
for /l %%i in (1,1,%LINE_COUNT%) do (
    call :PROCESS_LINE "!LINE[%%i]!"
)
endlocal

:: ❌ Bad - Inefficient nested file operations
for %%F in (*.txt) do (
    for /f %%L in (%%F) do (  :: Opens file multiple times
        echo %%L | findstr "pattern" >nul  :: Creates subprocess for each line
    )
)
```

### Array Processing Optimization
```batch
:: ✅ Good - Efficient array simulation
setlocal EnableDelayedExpansion

:: Build array efficiently
set "INDEX=0"
for %%F in ("%DATA_DIR%\*.csv") do (
    set /a "INDEX+=1"
    set "FILE_ARRAY[!INDEX!]=%%F"
)
set "TOTAL_FILES=%INDEX%"

:: Process array with single loop
for /l %%i in (1,1,%TOTAL_FILES%) do (
    if defined FILE_ARRAY[%%i] (
        call :PROCESS_CSV "!FILE_ARRAY[%%i]!"
    )
)
endlocal

:: ✅ Good - Hash table simulation for lookups
setlocal EnableDelayedExpansion
:: Create lookup table
set "EXTENSIONS[txt]=text"
set "EXTENSIONS[jpg]=image"
set "EXTENSIONS[mp4]=video"
set "EXTENSIONS[pdf]=document"

:: Fast lookup
set "FILE_EXT=%~x1"
set "FILE_EXT=%FILE_EXT:~1%"  :: Remove dot
if defined EXTENSIONS[%FILE_EXT%] (
    echo File type: !EXTENSIONS[%FILE_EXT%]!
)
endlocal
```

## String Processing Optimization

### Efficient String Operations
```batch
:: ✅ Good - Optimize string comparisons
:CHECK_FILE_TYPE
    setlocal
    set "FILENAME=%~1"
    set "EXT=%~x1"
    
    :: Use IF for simple comparisons (faster than FOR loops)
    if /i "%EXT%"==".txt" (
        set "TYPE=text"
    ) else if /i "%EXT%"==".jpg" (
        set "TYPE=image"
    ) else if /i "%EXT%"==".mp4" (
        set "TYPE=video"
    ) else (
        set "TYPE=unknown"
    )
    
    endlocal & set "FILE_TYPE=%TYPE%"
    exit /b 0

:: ✅ Good - Batch string replacements
:CLEAN_FILENAME
    setlocal EnableDelayedExpansion
    set "FILENAME=%~1"
    
    :: Replace multiple characters in one pass
    set "FILENAME=%FILENAME: =_%"
    set "FILENAME=%FILENAME::=-%"
    set "FILENAME=%FILENAME:?=_"
    set "FILENAME=%FILENAME:*=_"
    
    endlocal & set "CLEAN_NAME=%FILENAME%"
    exit /b 0

:: ✅ Good - Efficient string length calculation
:STRLEN
    setlocal EnableDelayedExpansion
    set "STR=%~2"
    set "LENGTH=0"
    
    :: Binary search for length (faster for long strings)
    for /l %%N in (12,-1,0) do (
        set /a "LENGTH|=1<<%%N"
        for %%P in (!LENGTH!) do if "!STR:~%%P,1!"=="" set /a "LENGTH&=~1<<%%N"
    )
    
    endlocal & set "%~1=%LENGTH%"
    exit /b 0
```

## Command Optimization

### Reduce External Command Calls
```batch
:: ✅ Good - Batch operations
:PROCESS_MULTIPLE_FILES
    setlocal
    set "FILE_LIST=%TEMP%\filelist.tmp"
    
    :: Generate file list once
    dir /b /a-d "%SOURCE_DIR%\*.txt" > "%FILE_LIST%" 2>nul
    
    :: Process entire list
    for /f "usebackq delims=" %%F in ("%FILE_LIST%") do (
        call :PROCESS_SINGLE "%%F"
    )
    
    del "%FILE_LIST%" 2>nul
    endlocal
    exit /b 0

:: ✅ Good - Combine multiple operations
:BACKUP_FILES
    setlocal
    set "SOURCE=%~1"
    set "DEST=%~2"
    set "TIMESTAMP=%DATE:~-4%%DATE:~-10,2%%DATE:~-7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
    set "TIMESTAMP=%TIMESTAMP: =0%"
    
    :: Single command for multiple files
    xcopy "%SOURCE%\*.*" "%DEST%\backup_%TIMESTAMP%\" /E /I /Q /Y > "%DEST%\backup.log"
    
    endlocal
    exit /b %ERRORLEVEL%

:: ✅ Good - Use native commands for complex operations
:FIND_AND_DELETE_OLD
    setlocal
    set "TARGET_DIR=%~1"
    set "DAYS_OLD=%~2"
    
    :: Use forfiles for date-based operations (native to Windows)
    forfiles /p "%TARGET_DIR%" /s /m *.log /d -%DAYS_OLD% /c "cmd /c del @path" 2>nul
    
    endlocal
    exit /b 0
```

## Memory Management

### Efficient Variable Handling
```batch
:: ✅ Good - Clear large variables when done
:PROCESS_LARGE_DATASET
    setlocal EnableDelayedExpansion
    
    :: Load data
    set "DATA_COUNT=0"
    for /f "usebackq delims=" %%L in ("%DATA_FILE%") do (
        set /a "DATA_COUNT+=1"
        set "DATA[!DATA_COUNT!]=%%L"
    )
    
    :: Process data
    for /l %%i in (1,1,%DATA_COUNT%) do (
        call :PROCESS_ITEM "!DATA[%%i]!"
    )
    
    :: Clear variables explicitly
    for /l %%i in (1,1,%DATA_COUNT%) do (
        set "DATA[%%i]="
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Stream processing for large files
:PROCESS_LARGE_FILE_STREAMING
    setlocal
    set "INPUT=%~1"
    set "OUTPUT=%~2"
    
    :: Process line by line without storing in memory
    (
        for /f "usebackq delims=" %%L in ("%INPUT%") do (
            set "LINE=%%L"
            call :TRANSFORM_LINE LINE
            echo !LINE!
        )
    ) > "%OUTPUT%"
    
    endlocal
    exit /b 0

:: ✅ Good - Use local scope to limit memory usage
:CALCULATE_STATS
    setlocal EnableDelayedExpansion
    set /a "SUM=0"
    set /a "COUNT=0"
    
    for %%N in (%*) do (
        set /a "SUM+=%%N"
        set /a "COUNT+=1"
    )
    
    if %COUNT% GTR 0 (
        set /a "AVERAGE=SUM/COUNT"
    ) else (
        set "AVERAGE=0"
    )
    
    endlocal & set "RESULT=%AVERAGE%"
    exit /b 0
```

## Process and Subprocess Optimization

### Minimize Process Creation
```batch
:: ✅ Good - Use arithmetic instead of external calculators
:CALCULATE
    setlocal
    set /a "RESULT=%1 * %2 + (%1 / 2)"
    endlocal & set "CALC_RESULT=%RESULT%"
    exit /b 0

:: ✅ Good - Use native formatting
:FORMAT_NUMBER
    setlocal EnableDelayedExpansion
    set "NUM=%~1"
    set "FORMATTED="
    
    :: Pad with zeros
    set "ZEROS=00000000"
    set "FORMATTED=%ZEROS%%NUM%"
    set "FORMATTED=!FORMATTED:~-8!"
    
    endlocal & set "FORMAT_RESULT=%FORMATTED%"
    exit /b 0

:: ✅ Good - Efficient process checking
:GET_PROCESS_COUNT
    setlocal
    set "PROCESS=%~1"
    set /a "COUNT=0"
    
    for /f %%P in ('tasklist /fi "imagename eq %PROCESS%" 2^>nul ^| find /c "%PROCESS%"') do (
        set "COUNT=%%P"
    )
    
    endlocal & set "PROCESS_COUNT=%COUNT%"
    exit /b 0
```

### Parallel Processing Techniques
```batch
:: ✅ Good - Simple parallel execution
:PROCESS_FILES_PARALLEL
    setlocal
    set "MAX_JOBS=4"
    set /a "JOB_COUNT=0"
    
    for %%F in (*.txt) do (
        set /a "JOB_COUNT+=1"
        start /b cmd /c call :PROCESS_SINGLE_FILE "%%F"
        
        :: Wait if max jobs reached
        if !JOB_COUNT! GEQ %MAX_JOBS% (
            :: Simple wait
            timeout /t 1 /nobreak >nul
            set /a "JOB_COUNT=0"
        )
    )
    
    :: Wait for remaining jobs
    :WAIT_JOBS
    tasklist | findstr /i "cmd.exe" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        timeout /t 1 /nobreak >nul
        goto :WAIT_JOBS
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Batch processing with START
:PARALLEL_COMPRESS
    setlocal
    set "SOURCE_DIR=%~1"
    
    :: Start multiple compression jobs
    for %%F in ("%SOURCE_DIR%\*.txt") do (
        start /min /wait cmd /c "compact /c "%%F" >nul 2>&1"
    )
    
    endlocal
    exit /b 0
```

## I/O Optimization

### Efficient File Operations
```batch
:: ✅ Good - Minimize disk I/O
:ATOMIC_WRITE
    setlocal
    set "TARGET=%~1"
    set "TEMP_FILE=%TARGET%.tmp.%RANDOM%"
    
    :: Write to temporary file first
    (
        echo Generated on %DATE% %TIME%
        call :GENERATE_CONFIG_DATA
    ) > "%TEMP_FILE%"
    
    :: Atomic move (as atomic as Windows allows)
    move /y "%TEMP_FILE%" "%TARGET%" >nul 2>&1
    
    endlocal
    exit /b %ERRORLEVEL%

:: ✅ Good - Batch file operations
:COPY_FILES_EFFICIENTLY
    setlocal
    set "SOURCE=%~1"
    set "DEST=%~2"
    
    :: Use ROBOCOPY for efficient copying (Windows Vista+)
    if exist "%WINDIR%\system32\robocopy.exe" (
        robocopy "%SOURCE%" "%DEST%" /E /MT:8 /R:1 /W:1 /NP /LOG:NUL
    ) else (
        :: Fallback to XCOPY
        xcopy "%SOURCE%\*.*" "%DEST%\" /E /I /Q /Y
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Read files in chunks
:PROCESS_LARGE_FILE_CHUNKS
    setlocal EnableDelayedExpansion
    set "FILE=%~1"
    set "CHUNK_SIZE=1000"
    set /a "LINE_NUM=0"
    set /a "CHUNK_NUM=0"
    
    for /f "usebackq delims=" %%L in ("%FILE%") do (
        set /a "LINE_NUM+=1"
        set "CHUNK[!LINE_NUM!]=%%L"
        
        if !LINE_NUM! GEQ %CHUNK_SIZE% (
            set /a "CHUNK_NUM+=1"
            call :PROCESS_CHUNK CHUNK !CHUNK_NUM!
            :: Clear chunk
            for /l %%i in (1,1,%CHUNK_SIZE%) do set "CHUNK[%%i]="
            set /a "LINE_NUM=0"
        )
    )
    
    :: Process remaining lines
    if %LINE_NUM% GTR 0 (
        set /a "CHUNK_NUM+=1"
        call :PROCESS_CHUNK CHUNK !CHUNK_NUM!
    )
    
    endlocal
    exit /b 0
```

## Network Performance

### Efficient Network Operations
```batch
:: ✅ Good - Batch download operations
:DOWNLOAD_MULTIPLE_FILES
    setlocal EnableDelayedExpansion
    set "BASE_URL=%~1"
    shift
    
    :: Create download script for efficiency
    set "DOWNLOAD_SCRIPT=%TEMP%\download_%RANDOM%.txt"
    
    :BUILD_LIST
    if "%~1"=="" goto :DO_DOWNLOAD
    echo %BASE_URL%/%~1 -O %~1 >> "%DOWNLOAD_SCRIPT%"
    shift
    goto :BUILD_LIST
    
    :DO_DOWNLOAD
    :: Use curl with input file (connection reuse)
    if exist "%DOWNLOAD_SCRIPT%" (
        curl -K "%DOWNLOAD_SCRIPT%" --parallel --parallel-max 5
        del "%DOWNLOAD_SCRIPT%" 2>nul
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Efficient health checks
:CHECK_SERVICE_HEALTH
    setlocal EnableDelayedExpansion
    set "TIMEOUT=5"
    
    :: Batch ping for multiple services
    set "SERVICES=%*"
    for %%S in (%SERVICES%) do (
        start /b cmd /c "ping -n 1 -w %TIMEOUT%000 %%S >nul 2>&1 && echo %%S: UP || echo %%S: DOWN"
    )
    
    :: Wait for all pings
    timeout /t %TIMEOUT% /nobreak >nul
    
    endlocal
    exit /b 0
```

## PowerShell Integration for Performance

### Strategic PowerShell Usage
```batch
:: ✅ Good - Use PowerShell for complex operations only
:PROCESS_JSON_EFFICIENTLY
    setlocal
    set "JSON_FILE=%~1"
    set "OUTPUT=%~2"
    
    :: Single PowerShell call for complex processing
    powershell -NoProfile -Command ^
        "$json = Get-Content '%JSON_FILE%' -Raw | ConvertFrom-Json; $json.data | ConvertTo-Csv -NoTypeInformation" > "%OUTPUT%"
    
    endlocal
    exit /b 0

:: ✅ Good - Batch PowerShell operations
:BATCH_POWERSHELL_OPS
    setlocal
    set "PS_SCRIPT=%TEMP%\batch_ops_%RANDOM%.ps1"
    
    :: Create PowerShell script for multiple operations
    (
        echo $results = @^(^)
        echo Get-ChildItem '*.txt' ^| ForEach-Object {
        echo     $results += [PSCustomObject]@{
        echo         Name = $_.Name
        echo         Size = $_.Length
        echo         Modified = $_.LastWriteTime
        echo     }
        echo }
        echo $results ^| Export-Csv 'file_info.csv' -NoTypeInformation
    ) > "%PS_SCRIPT%"
    
    :: Single PowerShell execution
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
    del "%PS_SCRIPT%" 2>nul
    
    endlocal
    exit /b 0
```

## Performance Monitoring

### Script Performance Measurement
```batch
:: ✅ Good - Time critical operations
:TIME_OPERATION
    setlocal EnableDelayedExpansion
    set "OPERATION=%~1"
    
    :: Get start time
    for /f "tokens=1-4 delims=:.," %%a in ("%TIME%") do (
        set /a "START=(((%%a*60)+%%b)*60+%%c)*100+%%d"
    )
    
    :: Execute operation
    shift
    call %*
    
    :: Get end time
    for /f "tokens=1-4 delims=:.," %%a in ("%TIME%") do (
        set /a "END=(((%%a*60)+%%b)*60+%%c)*100+%%d"
    )
    
    :: Calculate duration
    set /a "DURATION=END-START"
    set /a "SECONDS=DURATION/100"
    set /a "HUNDREDTHS=DURATION%%100"
    
    echo Operation: %OPERATION%
    echo Duration: %SECONDS%.%HUNDREDTHS% seconds
    
    endlocal
    exit /b 0

:: ✅ Good - Memory monitoring
:MONITOR_MEMORY
    setlocal
    set "PROCESS_NAME=%~nx0"
    
    :: Get memory usage
    for /f "tokens=5" %%M in ('tasklist /fi "imagename eq cmd.exe" /fo csv ^| findstr /i "%PROCESS_NAME%"') do (
        set "MEM_USAGE=%%M"
        set "MEM_USAGE=!MEM_USAGE:,=!"
        set "MEM_USAGE=!MEM_USAGE:"=!"
        echo [%DATE% %TIME%] Memory: !MEM_USAGE! >&2
    )
    
    endlocal
    exit /b 0

:: ✅ Good - Performance limits
:SET_PERFORMANCE_LIMITS
    :: Note: Windows has limited ulimit equivalents
    :: Use Windows Job Objects via WMIC or PowerShell for advanced limits
    
    :: Set process priority
    wmic process where "ProcessId=%PID%" call setpriority "Below Normal" >nul 2>&1
    
    :: Limit CPU cores (affinity)
    start /affinity 1 cmd /c "%~dpnx0" %*
    
    exit /b 0
```

## Performance Testing

### Benchmark Functions
```batch
:: ✅ Good - Compare implementations
:BENCHMARK_STRING_OPS
    setlocal EnableDelayedExpansion
    set "TEST_STRING=The quick brown fox jumps over the lazy dog"
    set /a "ITERATIONS=1000"
    
    :: Test native string replacement
    call :TIME_OPERATION "Native replacement" :TEST_NATIVE
    
    :: Test PowerShell equivalent
    call :TIME_OPERATION "PowerShell method" :TEST_POWERSHELL
    
    endlocal
    exit /b 0

:TEST_NATIVE
    setlocal EnableDelayedExpansion
    for /l %%i in (1,1,%ITERATIONS%) do (
        set "RESULT=%TEST_STRING:fox=cat%"
    )
    endlocal
    exit /b 0

:TEST_POWERSHELL
    setlocal
    for /l %%i in (1,1,%ITERATIONS%) do (
        for /f "delims=" %%R in ('powershell -Command "'%TEST_STRING%'.Replace('fox','cat')"') do (
            set "RESULT=%%R"
        )
    )
    endlocal
    exit /b 0

:: ✅ Good - Load testing
:LOAD_TEST_SCRIPT
    setlocal
    set "SCRIPT=%~1"
    set /a "CONCURRENT=10"
    set /a "ITERATIONS=100"
    
    echo Starting load test: %CONCURRENT% processes, %ITERATIONS% iterations each
    
    :: Start time
    set "START_TIME=%TIME%"
    
    :: Launch concurrent processes
    for /l %%P in (1,1,%CONCURRENT%) do (
        start /b cmd /c "for /l %%I in (1,1,%ITERATIONS%) do call "%SCRIPT%" >nul 2>&1"
    )
    
    :: Wait for completion
    :WAIT_COMPLETE
    timeout /t 1 /nobreak >nul
    tasklist | findstr /i "cmd.exe" | find /c "cmd.exe" > "%TEMP%\count.tmp"
    set /p COUNT=<"%TEMP%\count.tmp"
    if %COUNT% GTR 2 goto :WAIT_COMPLETE
    
    echo Load test completed
    del "%TEMP%\count.tmp" 2>nul
    
    endlocal
    exit /b 0
```

## Caching Strategies

### Implement Caching
```batch
:: ✅ Good - Cache expensive operations
:GET_SYSTEM_INFO_CACHED
    setlocal
    set "CACHE_FILE=%TEMP%\sysinfo_cache.txt"
    set "CACHE_AGE=300"  :: 5 minutes in seconds
    
    :: Check cache age
    call :IS_CACHE_VALID "%CACHE_FILE%" %CACHE_AGE%
    if %ERRORLEVEL% EQU 0 (
        :: Use cached data
        type "%CACHE_FILE%"
    ) else (
        :: Generate and cache new data
        (
            echo Generated: %DATE% %TIME%
            systeminfo
        ) > "%CACHE_FILE%"
        type "%CACHE_FILE%"
    )
    
    endlocal
    exit /b 0

:IS_CACHE_VALID
    setlocal
    set "FILE=%~1"
    set "MAX_AGE=%~2"
    
    if not exist "%FILE%" exit /b 1
    
    :: Get file age using forfiles
    forfiles /p "%~dp1" /m "%~nx1" /d +0 /c "cmd /c exit /b 0" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 exit /b 1
    
    exit /b 0
```

## Performance Checklist

### Windows Batch Performance Validation
- [ ] Use native CMD operations instead of external commands
- [ ] Avoid unnecessary subprocess creation
- [ ] Implement efficient loop patterns
- [ ] Use delayed expansion appropriately
- [ ] Minimize file I/O operations
- [ ] Batch operations where possible
- [ ] Clear large variables after use
- [ ] Use streaming for large file processing
- [ ] Implement proper variable scoping with setlocal/endlocal
- [ ] Cache expensive operations
- [ ] Use ROBOCOPY for large file operations (when available)
- [ ] Strategic PowerShell integration for complex tasks
- [ ] Monitor memory usage in long-running scripts
- [ ] Benchmark critical operations
- [ ] Use parallel processing for independent tasks
- [ ] Optimize string operations with native variable expansion