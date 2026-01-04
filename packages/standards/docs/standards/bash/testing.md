# Bash Testing Standards

> **Extends**: `/docs/standards/global/testing.md`
> 
> This document provides **Bash-specific** testing implementations and patterns. Apply these shell-specific testing strategies while following global testing principles.

## Bash Testing Environment Setup

### Test Framework Selection
For Bash testing, we recommend **Bats** (Bash Automated Testing System):

```bash
#!/usr/bin/env bash
# Install bats-core for testing
# Via package manager or git clone

# test/setup.bash
setup_file() {
    # File-level setup (runs once per test file)
    export TEST_TEMP_DIR="$(mktemp -d)"
    export PATH="$PWD/src:$PATH"  # Add source directory to PATH
}

teardown_file() {
    # File-level cleanup
    rm -rf "$TEST_TEMP_DIR"
}

setup() {
    # Test-level setup (runs before each test)
    cd "$TEST_TEMP_DIR"
    
    # Create clean test environment
    export TEST_CONFIG_FILE="$TEST_TEMP_DIR/config.conf"
    export TEST_LOG_FILE="$TEST_TEMP_DIR/test.log"
}

teardown() {
    # Test-level cleanup (runs after each test)
    unset TEST_CONFIG_FILE TEST_LOG_FILE
}
```

### Test Configuration
```bash
# test/test_helper.bash
#!/usr/bin/env bash

# Common test utilities and assertions
load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
load 'test_helper/bats-file/load'

# Mock external commands for testing
mock_command() {
    local cmd="$1"
    local mock_output="$2"
    local mock_exit_code="${3:-0}"
    
    # Create mock command in temporary directory
    cat > "$TEST_TEMP_DIR/$cmd" << EOF
#!/usr/bin/env bash
echo "$mock_output"
exit $mock_exit_code
EOF
    chmod +x "$TEST_TEMP_DIR/$cmd"
    export PATH="$TEST_TEMP_DIR:$PATH"
}

# Restore original command
restore_command() {
    local cmd="$1"
    rm -f "$TEST_TEMP_DIR/$cmd"
}

# Assert log contains specific message
assert_log_contains() {
    local expected="$1"
    local log_file="${2:-$TEST_LOG_FILE}"
    
    run grep -q "$expected" "$log_file"
    assert_success
}

# Assert file has specific permissions
assert_file_permission() {
    local file="$1"
    local expected_perm="$2"
    
    local actual_perm
    actual_perm=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%OLp" "$file")
    
    assert_equal "$actual_perm" "$expected_perm"
}
```

## Unit Testing Patterns

### Function Testing
```bash
#!/usr/bin/env bats
# test/unit/math_utils.bats

load '../test_helper'

# Source the script being tested
source src/math_utils.sh

@test "add_numbers: adds two positive numbers" {
    run add_numbers 5 3
    assert_success
    assert_output "8"
}

@test "add_numbers: handles zero correctly" {
    run add_numbers 0 5
    assert_success
    assert_output "5"
    
    run add_numbers 5 0
    assert_success
    assert_output "5"
}

@test "add_numbers: handles negative numbers" {
    run add_numbers -5 3
    assert_success
    assert_output "-2"
    
    run add_numbers 5 -3
    assert_success
    assert_output "2"
}

@test "add_numbers: validates input arguments" {
    run add_numbers
    assert_failure
    assert_output --partial "Error: Missing arguments"
    
    run add_numbers 5
    assert_failure
    assert_output --partial "Error: Missing arguments"
    
    run add_numbers abc 5
    assert_failure
    assert_output --partial "Error: Invalid number"
}

@test "add_numbers: handles large numbers" {
    run add_numbers 999999999 1
    assert_success
    assert_output "1000000000"
}

# Test with different input methods
@test "add_numbers: handles various number formats" {
    # Positive numbers
    run add_numbers 5 3
    assert_output "8"
    
    # Numbers with leading zeros
    run add_numbers 05 03
    assert_output "8"
    
    # Floating point (if supported)
    run add_numbers 5.5 2.3
    assert_output "7.8"
}
```

### Script Testing
```bash
#!/usr/bin/env bats
# test/integration/backup_script.bats

load '../test_helper'

setup() {
    # Create test directory structure
    mkdir -p "$TEST_TEMP_DIR/source"
    mkdir -p "$TEST_TEMP_DIR/backup"
    
    # Create test files
    echo "test content 1" > "$TEST_TEMP_DIR/source/file1.txt"
    echo "test content 2" > "$TEST_TEMP_DIR/source/file2.txt"
    mkdir -p "$TEST_TEMP_DIR/source/subdir"
    echo "sub content" > "$TEST_TEMP_DIR/source/subdir/file3.txt"
    
    # Set up environment
    export BACKUP_SOURCE="$TEST_TEMP_DIR/source"
    export BACKUP_DEST="$TEST_TEMP_DIR/backup"
    export BACKUP_LOG="$TEST_TEMP_DIR/backup.log"
}

@test "backup script: creates backup successfully" {
    run src/backup.sh
    
    assert_success
    assert_file_exist "$BACKUP_DEST/file1.txt"
    assert_file_exist "$BACKUP_DEST/file2.txt"
    assert_file_exist "$BACKUP_DEST/subdir/file3.txt"
    
    # Verify content
    assert_equal "$(cat "$BACKUP_DEST/file1.txt")" "test content 1"
    assert_equal "$(cat "$BACKUP_DEST/file2.txt")" "test content 2"
    assert_equal "$(cat "$BACKUP_DEST/subdir/file3.txt")" "sub content"
}

@test "backup script: handles missing source directory" {
    export BACKUP_SOURCE="$TEST_TEMP_DIR/nonexistent"
    
    run src/backup.sh
    
    assert_failure
    assert_output --partial "Error: Source directory does not exist"
}

@test "backup script: creates destination directory if not exists" {
    export BACKUP_DEST="$TEST_TEMP_DIR/new_backup"
    
    run src/backup.sh
    
    assert_success
    assert_dir_exist "$BACKUP_DEST"
    assert_file_exist "$BACKUP_DEST/file1.txt"
}

@test "backup script: logs operations correctly" {
    run src/backup.sh
    
    assert_success
    assert_file_exist "$BACKUP_LOG"
    assert_log_contains "Backup started"
    assert_log_contains "Backup completed successfully"
    assert_log_contains "Files backed up: 3"
}

@test "backup script: handles permission errors gracefully" {
    # Create a file we can't read
    touch "$TEST_TEMP_DIR/source/readonly.txt"
    chmod 000 "$TEST_TEMP_DIR/source/readonly.txt"
    
    run src/backup.sh
    
    # Should continue despite permission error
    assert_success
    assert_log_contains "Warning: Cannot read"
    assert_file_exist "$BACKUP_DEST/file1.txt"  # Other files should be backed up
}
```

## Configuration Testing
```bash
#!/usr/bin/env bats
# test/unit/config_parser.bats

load '../test_helper'

source src/config_parser.sh

setup() {
    # Create test config file
    cat > "$TEST_CONFIG_FILE" << 'EOF'
# Test configuration file
database_host=localhost
database_port=5432
database_name=testdb
database_user=testuser

# API settings
api_timeout=30
api_retries=3

# Feature flags
enable_logging=true
enable_metrics=false
EOF
}

@test "parse_config: reads configuration values correctly" {
    run parse_config "$TEST_CONFIG_FILE"
    assert_success
    
    # Test individual config values
    assert_equal "$(get_config_value database_host)" "localhost"
    assert_equal "$(get_config_value database_port)" "5432"
    assert_equal "$(get_config_value database_name)" "testdb"
    assert_equal "$(get_config_value api_timeout)" "30"
}

@test "parse_config: handles boolean values" {
    run parse_config "$TEST_CONFIG_FILE"
    assert_success
    
    assert_equal "$(get_config_value enable_logging)" "true"
    assert_equal "$(get_config_value enable_metrics)" "false"
}

@test "parse_config: ignores comments and empty lines" {
    cat > "$TEST_CONFIG_FILE" << 'EOF'
# This is a comment
   # Indented comment

setting1=value1

# Another comment
setting2=value2
   
EOF
    
    run parse_config "$TEST_CONFIG_FILE"
    assert_success
    
    assert_equal "$(get_config_value setting1)" "value1"
    assert_equal "$(get_config_value setting2)" "value2"
}

@test "parse_config: handles missing config file" {
    run parse_config "/nonexistent/config.conf"
    assert_failure
    assert_output --partial "Error: Configuration file not found"
}

@test "parse_config: validates required settings" {
    # Create config missing required settings
    cat > "$TEST_CONFIG_FILE" << 'EOF'
database_host=localhost
# Missing required database_name
EOF
    
    run validate_config "$TEST_CONFIG_FILE"
    assert_failure
    assert_output --partial "Error: Missing required setting: database_name"
}
```

## Error Handling Testing
```bash
#!/usr/bin/env bats
# test/unit/error_handling.bats

load '../test_helper'

source src/file_processor.sh

@test "process_file: handles file not found error" {
    run process_file "/nonexistent/file.txt"
    
    assert_failure
    assert_equal "$status" 2  # Specific exit code for file not found
    assert_output --partial "Error: File not found"
}

@test "process_file: handles permission denied error" {
    # Create file with no read permissions
    touch "$TEST_TEMP_DIR/noaccess.txt"
    chmod 000 "$TEST_TEMP_DIR/noaccess.txt"
    
    run process_file "$TEST_TEMP_DIR/noaccess.txt"
    
    assert_failure
    assert_equal "$status" 3  # Specific exit code for permission error
    assert_output --partial "Error: Permission denied"
    
    # Cleanup
    chmod 644 "$TEST_TEMP_DIR/noaccess.txt"
}

@test "process_file: handles empty file correctly" {
    touch "$TEST_TEMP_DIR/empty.txt"
    
    run process_file "$TEST_TEMP_DIR/empty.txt"
    
    assert_success
    assert_output --partial "Warning: File is empty"
}

@test "process_file: handles corrupted file gracefully" {
    # Create file with binary data that might cause issues
    printf '\x00\x01\x02\x03\xff\xfe\xfd' > "$TEST_TEMP_DIR/binary.txt"
    
    run process_file "$TEST_TEMP_DIR/binary.txt"
    
    # Should handle gracefully without crashing
    assert_failure
    assert_equal "$status" 4  # Specific exit code for format error
    assert_output --partial "Error: Invalid file format"
}

@test "process_file: validates input parameters" {
    # Test with no arguments
    run process_file
    assert_failure
    assert_equal "$status" 1  # Generic error code
    assert_output --partial "Usage:"
    
    # Test with too many arguments
    run process_file file1.txt file2.txt extra_arg
    assert_failure
    assert_equal "$status" 1
    assert_output --partial "Error: Too many arguments"
}
```

## Integration Testing
```bash
#!/usr/bin/env bats
# test/integration/full_workflow.bats

load '../test_helper'

setup() {
    # Set up complete test environment
    mkdir -p "$TEST_TEMP_DIR/input"
    mkdir -p "$TEST_TEMP_DIR/output"
    mkdir -p "$TEST_TEMP_DIR/logs"
    
    # Create test data
    echo "user1,admin,active" > "$TEST_TEMP_DIR/input/users.csv"
    echo "user2,user,inactive" >> "$TEST_TEMP_DIR/input/users.csv"
    echo "user3,admin,active" >> "$TEST_TEMP_DIR/input/users.csv"
    
    # Set environment for script
    export INPUT_DIR="$TEST_TEMP_DIR/input"
    export OUTPUT_DIR="$TEST_TEMP_DIR/output"
    export LOG_DIR="$TEST_TEMP_DIR/logs"
    export CONFIG_FILE="$TEST_TEMP_DIR/config.conf"
    
    # Create config file
    cat > "$CONFIG_FILE" << 'EOF'
input_format=csv
output_format=json
enable_validation=true
log_level=info
EOF
}

@test "full workflow: processes user data end-to-end" {
    # Run the main script
    run src/process_users.sh
    
    assert_success
    
    # Verify output files were created
    assert_file_exist "$OUTPUT_DIR/active_admins.json"
    assert_file_exist "$OUTPUT_DIR/inactive_users.json"
    assert_file_exist "$LOG_DIR/process.log"
    
    # Verify content
    run jq -r '.[] | .username' "$OUTPUT_DIR/active_admins.json"
    assert_success
    assert_line --index 0 "user1"
    assert_line --index 1 "user3"
    
    # Verify logging
    assert_log_contains "Processing started" "$LOG_DIR/process.log"
    assert_log_contains "Processed 3 users" "$LOG_DIR/process.log"
    assert_log_contains "Processing completed" "$LOG_DIR/process.log"
}

@test "full workflow: handles invalid input data" {
    # Create invalid CSV
    echo "invalid,data,format,extra_field" > "$INPUT_DIR/users.csv"
    
    run src/process_users.sh
    
    assert_failure
    assert_log_contains "Error: Invalid CSV format" "$LOG_DIR/process.log"
}

@test "full workflow: continues processing with warnings" {
    # Mix valid and invalid data
    echo "user1,admin,active" > "$INPUT_DIR/users.csv"
    echo "invalid_line" >> "$INPUT_DIR/users.csv"
    echo "user2,user,active" >> "$INPUT_DIR/users.csv"
    
    run src/process_users.sh
    
    assert_success  # Should continue despite warnings
    assert_log_contains "Warning: Skipping invalid line" "$LOG_DIR/process.log"
    
    # Should still process valid data
    assert_file_exist "$OUTPUT_DIR/active_admins.json"
}
```

## Performance Testing
```bash
#!/usr/bin/env bats
# test/performance/large_file_processing.bats

load '../test_helper'

setup() {
    # Generate large test file (10MB)
    head -c 10485760 /dev/urandom | base64 > "$TEST_TEMP_DIR/large_file.txt"
    
    # Set performance thresholds
    export MAX_PROCESSING_TIME=30  # seconds
    export MAX_MEMORY_MB=100
}

@test "performance: processes large file within time limit" {
    start_time=$(date +%s)
    
    run timeout $MAX_PROCESSING_TIME src/process_large_file.sh "$TEST_TEMP_DIR/large_file.txt"
    
    end_time=$(date +%s)
    processing_time=$((end_time - start_time))
    
    assert_success
    assert [ "$processing_time" -lt "$MAX_PROCESSING_TIME" ]
    
    echo "Processing time: ${processing_time}s" >&3
}

@test "performance: memory usage stays within limits" {
    # Monitor memory usage during processing
    {
        src/process_large_file.sh "$TEST_TEMP_DIR/large_file.txt" &
        local pid=$!
        
        local max_memory=0
        while kill -0 $pid 2>/dev/null; do
            local current_memory
            current_memory=$(ps -o rss= -p $pid | tr -d ' ')
            current_memory=$((current_memory / 1024))  # Convert to MB
            
            if [ "$current_memory" -gt "$max_memory" ]; then
                max_memory=$current_memory
            fi
            
            sleep 0.1
        done
        
        wait $pid
        local exit_code=$?
        
        echo "Max memory usage: ${max_memory}MB" >&3
        assert [ "$max_memory" -lt "$MAX_MEMORY_MB" ]
        assert_equal "$exit_code" 0
    }
}

@test "performance: handles concurrent processing" {
    local num_concurrent=5
    local pids=()
    
    # Start multiple processes
    for i in $(seq 1 $num_concurrent); do
        cp "$TEST_TEMP_DIR/large_file.txt" "$TEST_TEMP_DIR/file_$i.txt"
        src/process_large_file.sh "$TEST_TEMP_DIR/file_$i.txt" &
        pids+=($!)
    done
    
    # Wait for all to complete
    local failed=0
    for pid in "${pids[@]}"; do
        if ! wait $pid; then
            failed=$((failed + 1))
        fi
    done
    
    assert_equal "$failed" 0
    echo "Successfully processed $num_concurrent files concurrently" >&3
}
```

## Mock Testing for External Dependencies
```bash
#!/usr/bin/env bats
# test/unit/api_client.bats

load '../test_helper'

source src/api_client.sh

@test "fetch_user_data: handles successful API response" {
    # Mock curl command
    mock_command "curl" '{"user": "john", "status": "active"}'
    
    run fetch_user_data "john"
    
    assert_success
    assert_output --partial '"user": "john"'
    assert_output --partial '"status": "active"'
    
    restore_command "curl"
}

@test "fetch_user_data: handles API timeout" {
    # Mock curl to simulate timeout
    mock_command "curl" "" 28  # curl timeout exit code
    
    run fetch_user_data "john"
    
    assert_failure
    assert_equal "$status" 28
    assert_output --partial "Error: API request timed out"
    
    restore_command "curl"
}

@test "fetch_user_data: handles network errors" {
    # Mock curl to simulate network error
    mock_command "curl" "curl: (6) Could not resolve host" 6
    
    run fetch_user_data "john"
    
    assert_failure
    assert_equal "$status" 6
    assert_output --partial "Error: Network error"
    
    restore_command "curl"
}

@test "fetch_user_data: validates API response format" {
    # Mock invalid JSON response
    mock_command "curl" 'invalid json response'
    
    run fetch_user_data "john"
    
    assert_failure
    assert_output --partial "Error: Invalid JSON response"
    
    restore_command "curl"
}

@test "send_notification: uses correct webhook URL" {
    # Mock curl and capture arguments
    cat > "$TEST_TEMP_DIR/curl" << 'EOF'
#!/usr/bin/env bash
echo "curl called with: $*" >> /tmp/curl_calls.log
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/curl"
    
    export WEBHOOK_URL="https://hooks.slack.com/test"
    run send_notification "Test message"
    
    assert_success
    assert_file_exist "/tmp/curl_calls.log"
    run cat /tmp/curl_calls.log
    assert_output --partial "$WEBHOOK_URL"
    assert_output --partial "Test message"
    
    # Cleanup
    rm -f /tmp/curl_calls.log
    restore_command "curl"
}
```

## Testing Utilities and Helpers
```bash
# test/test_helper.bash - Extended utilities

# Time a command execution
time_command() {
    local start_time end_time duration
    start_time=$(date +%s.%N)
    
    "$@"
    local exit_code=$?
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    echo "Command took: ${duration}s" >&3
    return $exit_code
}

# Assert command completes within time limit
assert_completes_within() {
    local time_limit="$1"
    shift
    
    local start_time end_time duration
    start_time=$(date +%s.%N)
    
    run "$@"
    local exit_code=$?
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    local within_limit
    within_limit=$(echo "$duration <= $time_limit" | bc -l)
    
    if [ "$within_limit" -eq 0 ]; then
        fail "Command took ${duration}s, expected <= ${time_limit}s"
    fi
    
    return $exit_code
}

# Create test file with specific size
create_test_file() {
    local file="$1"
    local size="$2"  # in bytes
    
    head -c "$size" /dev/urandom > "$file"
}

# Assert file size
assert_file_size() {
    local file="$1"
    local expected_size="$2"
    
    local actual_size
    actual_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    
    assert_equal "$actual_size" "$expected_size"
}

# Create directory structure for testing
setup_test_directory() {
    local structure="$1"
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*$ ]]; then
            continue
        fi
        
        if [[ "$line" == */ ]]; then
            mkdir -p "$TEST_TEMP_DIR/${line%/}"
        else
            local dir
            dir=$(dirname "$TEST_TEMP_DIR/$line")
            mkdir -p "$dir"
            touch "$TEST_TEMP_DIR/$line"
        fi
    done <<< "$structure"
}
```

## Bash Testing Best Practices

### Test Organization
```bash
# Organize tests by functionality
test/
├── unit/                    # Unit tests for functions
│   ├── math_utils.bats
│   ├── string_utils.bats
│   └── config_parser.bats
├── integration/             # Integration tests
│   ├── full_workflow.bats
│   └── api_integration.bats
├── performance/             # Performance tests
│   └── large_file_processing.bats
└── test_helper.bash         # Common utilities
```

### Exit Code Testing
```bash
# Test specific exit codes for different error conditions
@test "script exits with correct codes for different errors" {
    # Success
    run successful_operation
    assert_equal "$status" 0
    
    # Generic error
    run operation_with_generic_error
    assert_equal "$status" 1
    
    # File not found
    run operation_with_missing_file
    assert_equal "$status" 2
    
    # Permission error
    run operation_with_permission_error
    assert_equal "$status" 3
}
```

### Environment Variable Testing
```bash
# Test environment variable handling
@test "script respects environment variables" {
    export DEBUG_MODE=true
    export LOG_LEVEL=debug
    
    run my_script
    
    assert_success
    assert_log_contains "DEBUG:" "$TEST_LOG_FILE"
}
```

## Bash Testing Checklist

### Unit Tests
- [ ] All functions tested with valid inputs
- [ ] All functions tested with invalid inputs
- [ ] All functions tested with edge cases (empty, null, large values)
- [ ] All error conditions properly tested
- [ ] All exit codes validated

### Integration Tests
- [ ] Full script workflows tested end-to-end
- [ ] External command interactions mocked and tested
- [ ] File system operations tested safely in temp directories
- [ ] Environment variable handling tested
- [ ] Configuration file parsing tested

### Error Handling Tests
- [ ] Missing files and directories handled gracefully
- [ ] Permission errors handled appropriately
- [ ] Invalid input data handled safely
- [ ] Network failures (for scripts with network calls) handled
- [ ] Disk space and memory limits considered

### Performance Tests
- [ ] Large file processing tested for time and memory limits
- [ ] Concurrent execution tested when applicable
- [ ] Resource cleanup verified
- [ ] Memory leaks checked for long-running processes

Remember: Bash tests should be isolated, use temporary directories for file operations, and mock external dependencies to ensure deterministic results.