# Bash Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **Bash-specific** implementations of the enterprise coding guidelines. Always follow the global principles while applying these language-specific patterns.

## Shell Selection and Compatibility

### Shebang Standards
```bash
# ✅ Good - Explicit bash requirement
#!/bin/bash

# ✅ Good - Portable POSIX shell (when bash features not needed)
#!/bin/sh

# ✅ Good - env for better portability
#!/usr/bin/env bash

# ❌ Bad - Default system shell (unpredictable)
#!/bin/sh  # when using bash features

# ❌ Bad - Hardcoded path that may not exist
#!/usr/local/bin/bash
```

### Bash Version Requirements
```bash
# Check bash version at script start
if [[ "${BASH_VERSION%%.*}" -lt 4 ]]; then
    echo "Error: Bash 4.0 or higher required" >&2
    exit 1
fi

# Declare required features
# shellcheck disable=SC2034
readonly REQUIRED_BASH_VERSION="4.0"
```

## Variable Naming and Declaration

### Variable Naming Conventions
```bash
# ✅ Good - Descriptive names
readonly DATABASE_HOST="localhost"
readonly MAX_RETRY_ATTEMPTS=3
readonly LOG_FILE_PATH="/var/log/app.log"

user_input=""
is_valid_email=false
processed_files_count=0

# ✅ Good - Arrays with descriptive names
readonly SUPPORTED_FORMATS=("json" "xml" "yaml" "csv")
required_packages=("curl" "jq" "yq")
processing_results=()

# ❌ Bad - Single letter or abbreviated names
readonly DB="localhost"
readonly MAX=3
u=""
valid=false
```

### Variable Declaration Best Practices
```bash
# ✅ Good - Always declare variables
declare user_name=""
declare -i file_count=0
declare -r SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
declare -a processing_queue=()

# ✅ Good - Explicit readonly for constants
readonly API_VERSION="v1"
readonly CONFIG_FILE="${HOME}/.myapp/config"

# ✅ Good - Local variables in functions
function process_data() {
    local input_file="$1"
    local output_dir="$2"
    local -i line_count=0
    
    # Process file...
}

# ❌ Bad - Global variables without declaration
file_path="$1"  # Should be local or explicitly declared
count=0         # Should be declared with type
```

## String Handling and Quoting

### Quoting Rules
```bash
# ✅ Good - Always quote variables
echo "Processing file: ${file_name}"
mkdir -p "${output_directory}"
cp "${source_file}" "${destination_path}"

# ✅ Good - Quote command substitutions
current_time="$(date '+%Y-%m-%d %H:%M:%S')"
file_count="$(find "${directory}" -name '*.txt' | wc -l)"

# ✅ Good - Arrays with proper quoting
readonly VALID_OPTIONS=("create" "update" "delete" "list")
for option in "${VALID_OPTIONS[@]}"; do
    echo "Option: ${option}"
done

# ❌ Bad - Unquoted variables (word splitting issues)
echo Processing file: $file_name
mkdir -p $output_directory
for option in ${VALID_OPTIONS[@]}; do  # Wrong array expansion
    echo "Option: $option"
done
```

### String Manipulation
```bash
# ✅ Good - Parameter expansion for string manipulation
filename="${full_path##*/}"           # Extract filename
extension="${filename##*.}"           # Extract extension
basename="${filename%.*}"             # Remove extension
directory="${full_path%/*}"           # Extract directory

# ✅ Good - Case conversion (Bash 4+)
uppercase_name="${name^^}"
lowercase_name="${name,,}"

# ✅ Good - String replacement
clean_text="${user_input//[^a-zA-Z0-9]/_}"  # Replace non-alphanumeric
safe_filename="${filename// /_}"              # Replace spaces

# ✅ Good - String validation
if [[ "${email}" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "Valid email format"
fi

# ❌ Bad - External tools for simple operations
filename=$(basename "$full_path")      # Use parameter expansion instead
uppercase=$(echo "$name" | tr '[:lower:]' '[:upper:]')  # Use ${name^^}
```

## Error Handling and Exit Codes

### Robust Error Handling
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ✅ Good - Custom error handler
error_handler() {
    local exit_code=$?
    local line_number=$1
    echo "Error: Command failed with exit code ${exit_code} on line ${line_number}" >&2
    echo "Call stack:" >&2
    local frame=0
    while caller $frame >&2; do
        ((frame++))
    done
    exit "${exit_code}"
}

trap 'error_handler ${LINENO}' ERR

# ✅ Good - Explicit error checking
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed" >&2
    exit 2
fi

if [[ ! -f "${config_file}" ]]; then
    echo "Error: Configuration file '${config_file}' not found" >&2
    exit 3
fi

# ✅ Good - Function error handling
process_file() {
    local file="$1"
    
    if [[ ! -r "${file}" ]]; then
        echo "Error: Cannot read file '${file}'" >&2
        return 1
    fi
    
    if ! jq '.' "${file}" >/dev/null 2>&1; then
        echo "Error: Invalid JSON in file '${file}'" >&2
        return 2
    fi
    
    # Process file...
    return 0
}

# Usage with error handling
if ! process_file "${input_file}"; then
    echo "Failed to process file" >&2
    exit 1
fi
```

### Exit Code Standards
```bash
# Standard exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_GENERAL_ERROR=1
readonly EXIT_MISUSE=2
readonly EXIT_NO_EXECUTE=126
readonly EXIT_NOT_FOUND=127
readonly EXIT_INVALID_ARGS=128

# Custom application exit codes
readonly EXIT_CONFIG_ERROR=10
readonly EXIT_NETWORK_ERROR=11
readonly EXIT_PERMISSION_ERROR=12
readonly EXIT_RESOURCE_ERROR=13

validate_arguments() {
    if [[ $# -lt 2 ]]; then
        echo "Usage: $0 <input_file> <output_dir>" >&2
        exit "${EXIT_INVALID_ARGS}"
    fi
    
    if [[ ! -f "$1" ]]; then
        echo "Error: Input file '$1' does not exist" >&2
        exit "${EXIT_NOT_FOUND}"
    fi
}
```

## Function Design Patterns

### Function Structure
```bash
# ✅ Good - Well-structured function
process_json_file() {
    # Function documentation
    # Processes a JSON file and extracts specific data
    # Arguments:
    #   $1 - Input JSON file path
    #   $2 - Output directory path
    #   $3 - (optional) Format: json|yaml|csv (default: json)
    # Returns:
    #   0 - Success
    #   1 - Invalid arguments
    #   2 - Processing error
    
    local input_file="$1"
    local output_dir="$2"
    local format="${3:-json}"
    
    # Input validation
    if [[ $# -lt 2 || $# -gt 3 ]]; then
        echo "Error: Invalid number of arguments" >&2
        return 1
    fi
    
    if [[ ! -f "${input_file}" ]]; then
        echo "Error: Input file '${input_file}' not found" >&2
        return 1
    fi
    
    if [[ ! -d "${output_dir}" ]]; then
        echo "Error: Output directory '${output_dir}' not found" >&2
        return 1
    fi
    
    # Main processing logic
    local temp_file
    temp_file="$(mktemp)"
    
    if ! jq '.data[]' "${input_file}" > "${temp_file}"; then
        echo "Error: Failed to process JSON file" >&2
        rm -f "${temp_file}"
        return 2
    fi
    
    # Generate output based on format
    case "${format}" in
        json)
            cp "${temp_file}" "${output_dir}/processed.json"
            ;;
        yaml)
            yq eval '.' "${temp_file}" > "${output_dir}/processed.yaml"
            ;;
        csv)
            jq -r '@csv' "${temp_file}" > "${output_dir}/processed.csv"
            ;;
        *)
            echo "Error: Unsupported format '${format}'" >&2
            rm -f "${temp_file}"
            return 1
            ;;
    esac
    
    # Cleanup
    rm -f "${temp_file}"
    echo "Successfully processed '${input_file}' to '${output_dir}'"
    return 0
}
```

### Parameter Validation Patterns
```bash
# ✅ Good - Comprehensive parameter validation
validate_email() {
    local email="$1"
    
    # Check if email is provided
    if [[ -z "${email}" ]]; then
        return 1
    fi
    
    # Check basic format
    if [[ ! "${email}" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    
    # Check length limits
    if [[ ${#email} -gt 254 ]]; then
        return 1
    fi
    
    return 0
}

validate_port() {
    local port="$1"
    
    # Check if it's a number
    if [[ ! "${port}" =~ ^[0-9]+$ ]]; then
        return 1
    fi
    
    # Check range
    if [[ "${port}" -lt 1 || "${port}" -gt 65535 ]]; then
        return 1
    fi
    
    return 0
}
```

## Array and Data Structure Handling

### Array Best Practices
```bash
# ✅ Good - Array declaration and manipulation
declare -a log_files=()
declare -A config_values=()
readonly SUPPORTED_TYPES=("string" "number" "boolean" "array")

# Adding elements safely
log_files+=("${new_log_file}")

# Iterating over arrays
for file in "${log_files[@]}"; do
    if [[ -f "${file}" ]]; then
        process_log_file "${file}"
    fi
done

# Associative arrays
config_values["database_host"]="localhost"
config_values["database_port"]="5432"
config_values["max_connections"]="100"

# Check if key exists
if [[ -n "${config_values[database_host]:-}" ]]; then
    connect_to_database "${config_values[database_host]}"
fi

# Array length checking
if [[ ${#log_files[@]} -eq 0 ]]; then
    echo "No log files to process" >&2
    return 1
fi

# ✅ Good - Array filtering
filter_existing_files() {
    local -n input_array=$1
    local -n output_array=$2
    
    for file in "${input_array[@]}"; do
        if [[ -f "${file}" ]]; then
            output_array+=("${file}")
        fi
    done
}

declare -a all_files=("/tmp/file1.txt" "/tmp/file2.txt" "/nonexistent.txt")
declare -a existing_files=()
filter_existing_files all_files existing_files
```

## File and Directory Operations

### Safe File Operations
```bash
# ✅ Good - Safe file reading
read_config_file() {
    local config_file="$1"
    
    if [[ ! -f "${config_file}" ]]; then
        echo "Error: Config file '${config_file}' not found" >&2
        return 1
    fi
    
    if [[ ! -r "${config_file}" ]]; then
        echo "Error: No read permission for '${config_file}'" >&2
        return 1
    fi
    
    while IFS='=' read -r key value || [[ -n "${key}" ]]; do
        # Skip comments and empty lines
        [[ "${key}" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${key// }" ]] && continue
        
        # Remove leading/trailing whitespace
        key="${key// /}"
        value="${value#"${value%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"
        
        # Store in associative array
        config["${key}"]="${value}"
    done < "${config_file}"
}

# ✅ Good - Safe temporary file handling
create_temp_workspace() {
    local temp_dir
    
    if ! temp_dir="$(mktemp -d)"; then
        echo "Error: Failed to create temporary directory" >&2
        return 1
    fi
    
    # Cleanup trap
    trap "rm -rf '${temp_dir}'" EXIT INT TERM
    
    echo "${temp_dir}"
}

# ✅ Good - Directory traversal protection
validate_path() {
    local path="$1"
    local base_dir="$2"
    
    # Resolve to absolute path
    local resolved_path
    resolved_path="$(realpath "${path}" 2>/dev/null)" || return 1
    
    # Check if path is within base directory
    if [[ "${resolved_path}" != "${base_dir}"* ]]; then
        echo "Error: Path '${path}' is outside allowed directory" >&2
        return 1
    fi
    
    return 0
}
```

### Atomic Operations
```bash
# ✅ Good - Atomic file updates
update_config_atomically() {
    local config_file="$1"
    local temp_file="${config_file}.tmp.$$"
    
    # Create new config in temporary file
    {
        echo "# Generated on $(date)"
        echo "version=1.0"
        echo "updated_at=$(date -Iseconds)"
        # ... other config values
    } > "${temp_file}"
    
    # Validate the new config
    if ! validate_config_file "${temp_file}"; then
        rm -f "${temp_file}"
        echo "Error: Generated config is invalid" >&2
        return 1
    fi
    
    # Atomic move
    if ! mv "${temp_file}" "${config_file}"; then
        rm -f "${temp_file}"
        echo "Error: Failed to update config file" >&2
        return 1
    fi
    
    echo "Config file updated successfully"
    return 0
}
```

## Process and Command Management

### Command Execution Patterns
```bash
# ✅ Good - Safe command execution with timeout
execute_with_timeout() {
    local timeout_seconds="$1"
    shift
    local command=("$@")
    
    # Execute command in background
    "${command[@]}" &
    local pid=$!
    
    # Wait with timeout
    local count=0
    while kill -0 "${pid}" 2>/dev/null; do
        if [[ ${count} -ge ${timeout_seconds} ]]; then
            kill -TERM "${pid}" 2>/dev/null
            sleep 2
            kill -KILL "${pid}" 2>/dev/null
            echo "Error: Command timed out after ${timeout_seconds} seconds" >&2
            return 124  # Standard timeout exit code
        fi
        sleep 1
        ((count++))
    done
    
    # Get exit status
    wait "${pid}"
    return $?
}

# ✅ Good - Retry mechanism
retry_command() {
    local max_attempts="$1"
    local delay="$2"
    shift 2
    local command=("$@")
    
    local attempt=1
    while [[ ${attempt} -le ${max_attempts} ]]; do
        echo "Attempt ${attempt}/${max_attempts}: ${command[*]}"
        
        if "${command[@]}"; then
            echo "Command succeeded on attempt ${attempt}"
            return 0
        fi
        
        if [[ ${attempt} -lt ${max_attempts} ]]; then
            echo "Command failed, retrying in ${delay} seconds..."
            sleep "${delay}"
        fi
        
        ((attempt++))
    done
    
    echo "Command failed after ${max_attempts} attempts" >&2
    return 1
}

# Usage
if ! retry_command 3 5 curl -fsSL "https://api.example.com/status"; then
    echo "API health check failed" >&2
    exit 1
fi
```

### Process Management
```bash
# ✅ Good - Background job management
manage_background_job() {
    local job_name="$1"
    local log_file="$2"
    shift 2
    local command=("$@")
    
    echo "Starting job: ${job_name}"
    
    # Start job in background
    "${command[@]}" > "${log_file}" 2>&1 &
    local pid=$!
    
    # Store PID for later reference
    echo "${pid}" > "/tmp/${job_name}.pid"
    
    echo "Job ${job_name} started with PID ${pid}"
    echo "Logs: ${log_file}"
    
    return 0
}

stop_background_job() {
    local job_name="$1"
    local pid_file="/tmp/${job_name}.pid"
    
    if [[ ! -f "${pid_file}" ]]; then
        echo "No PID file found for job: ${job_name}" >&2
        return 1
    fi
    
    local pid
    pid="$(cat "${pid_file}")"
    
    if kill -0 "${pid}" 2>/dev/null; then
        echo "Stopping job ${job_name} (PID: ${pid})"
        kill -TERM "${pid}"
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "${pid}" 2>/dev/null && [[ ${count} -lt 30 ]]; do
            sleep 1
            ((count++))
        done
        
        # Force kill if still running
        if kill -0 "${pid}" 2>/dev/null; then
            echo "Force killing job ${job_name}"
            kill -KILL "${pid}"
        fi
        
        rm -f "${pid_file}"
        echo "Job ${job_name} stopped"
    else
        echo "Job ${job_name} is not running"
        rm -f "${pid_file}"
    fi
}
```

## Logging and Debugging

### Structured Logging
```bash
# ✅ Good - Structured logging system
readonly LOG_LEVEL_DEBUG=0
readonly LOG_LEVEL_INFO=1
readonly LOG_LEVEL_WARN=2
readonly LOG_LEVEL_ERROR=3

# Default log level
LOG_LEVEL="${LOG_LEVEL:-$LOG_LEVEL_INFO}"
LOG_FILE="${LOG_FILE:-}"

log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    # Check if we should log this level
    case "${level}" in
        DEBUG) [[ ${LOG_LEVEL} -le ${LOG_LEVEL_DEBUG} ]] || return 0 ;;
        INFO)  [[ ${LOG_LEVEL} -le ${LOG_LEVEL_INFO} ]] || return 0 ;;
        WARN)  [[ ${LOG_LEVEL} -le ${LOG_LEVEL_WARN} ]] || return 0 ;;
        ERROR) [[ ${LOG_LEVEL} -le ${LOG_LEVEL_ERROR} ]] || return 0 ;;
    esac
    
    local log_line="[${timestamp}] [${level}] [PID:$$] ${message}"
    
    # Output to stderr for WARN/ERROR, stdout for others
    case "${level}" in
        WARN|ERROR)
            echo "${log_line}" >&2
            ;;
        *)
            echo "${log_line}"
            ;;
    esac
    
    # Also log to file if specified
    if [[ -n "${LOG_FILE}" ]]; then
        echo "${log_line}" >> "${LOG_FILE}"
    fi
}

# Convenience functions
log_debug() { log "DEBUG" "$1"; }
log_info() { log "INFO" "$1"; }
log_warn() { log "WARN" "$1"; }
log_error() { log "ERROR" "$1"; }

# Usage examples
log_info "Starting application"
log_debug "Processing file: ${file_path}"
log_warn "Configuration file not found, using defaults"
log_error "Failed to connect to database"
```

### Debug Mode Support
```bash
# ✅ Good - Debug mode implementation
readonly SCRIPT_NAME="${0##*/}"
DEBUG_MODE="${DEBUG:-false}"

debug() {
    if [[ "${DEBUG_MODE}" == "true" ]]; then
        echo "DEBUG [${SCRIPT_NAME}]: $*" >&2
    fi
}

debug_vars() {
    if [[ "${DEBUG_MODE}" == "true" ]]; then
        echo "DEBUG [${SCRIPT_NAME}]: Variables:" >&2
        for var in "$@"; do
            echo "  ${var}=${!var:-<unset>}" >&2
        done
    fi
}

# Enable debug mode based on environment
if [[ "${DEBUG_MODE}" == "true" ]]; then
    set -x  # Enable command tracing
    log_info "Debug mode enabled"
fi

# Usage
debug "Starting file processing"
debug_vars "input_file" "output_dir" "format"
```

## Signal Handling and Cleanup

### Graceful Shutdown
```bash
#!/bin/bash

# Global variables for cleanup
declare -a TEMP_FILES=()
declare -a TEMP_DIRS=()
declare -a BACKGROUND_PIDS=()

# ✅ Good - Comprehensive cleanup function
cleanup() {
    local exit_code=${1:-$?}
    
    echo "Performing cleanup..." >&2
    
    # Stop background processes
    for pid in "${BACKGROUND_PIDS[@]}"; do
        if kill -0 "${pid}" 2>/dev/null; then
            echo "Stopping process ${pid}" >&2
            kill -TERM "${pid}" 2>/dev/null
            sleep 2
            if kill -0 "${pid}" 2>/dev/null; then
                kill -KILL "${pid}" 2>/dev/null
            fi
        fi
    done
    
    # Remove temporary files
    for file in "${TEMP_FILES[@]}"; do
        if [[ -f "${file}" ]]; then
            rm -f "${file}"
            echo "Removed temporary file: ${file}" >&2
        fi
    done
    
    # Remove temporary directories
    for dir in "${TEMP_DIRS[@]}"; do
        if [[ -d "${dir}" ]]; then
            rm -rf "${dir}"
            echo "Removed temporary directory: ${dir}" >&2
        fi
    done
    
    # Restore terminal settings if needed
    if [[ -t 1 ]]; then
        stty sane 2>/dev/null
    fi
    
    echo "Cleanup completed" >&2
    exit "${exit_code}"
}

# Register signal handlers
trap cleanup EXIT
trap 'cleanup 130' INT   # Ctrl+C
trap 'cleanup 143' TERM  # Termination signal

# Helper functions to register resources for cleanup
register_temp_file() {
    TEMP_FILES+=("$1")
}

register_temp_dir() {
    TEMP_DIRS+=("$1")
}

register_background_process() {
    BACKGROUND_PIDS+=("$1")
}
```

## Testing and Validation

### Input Validation
```bash
# ✅ Good - Comprehensive input validation
validate_input() {
    local input="$1"
    local type="$2"
    
    case "${type}" in
        "email")
            [[ "${input}" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]
            ;;
        "ip")
            [[ "${input}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && {
                IFS='.' read -ra octets <<< "${input}"
                for octet in "${octets[@]}"; do
                    [[ "${octet}" -ge 0 && "${octet}" -le 255 ]] || return 1
                done
            }
            ;;
        "port")
            [[ "${input}" =~ ^[0-9]+$ ]] && [[ "${input}" -ge 1 && "${input}" -le 65535 ]]
            ;;
        "url")
            [[ "${input}" =~ ^https?://[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})(:[0-9]+)?(/.*)?$ ]]
            ;;
        "filename")
            [[ "${input}" =~ ^[a-zA-Z0-9._-]+$ ]] && [[ "${#input}" -le 255 ]]
            ;;
        *)
            return 1
            ;;
    esac
}

# ✅ Good - Test functions
test_validate_input() {
    local tests_passed=0
    local tests_total=0
    
    # Email validation tests
    local test_emails=(
        "user@example.com:true"
        "invalid.email:false"
        "@example.com:false"
        "user@:false"
    )
    
    for test in "${test_emails[@]}"; do
        IFS=':' read -r email expected <<< "${test}"
        ((tests_total++))
        
        if validate_input "${email}" "email"; then
            result="true"
        else
            result="false"
        fi
        
        if [[ "${result}" == "${expected}" ]]; then
            echo "✓ Email test passed: ${email}"
            ((tests_passed++))
        else
            echo "✗ Email test failed: ${email} (expected: ${expected}, got: ${result})"
        fi
    done
    
    echo "Tests passed: ${tests_passed}/${tests_total}"
    [[ ${tests_passed} -eq ${tests_total} ]]
}
```

## Performance Considerations

### Efficient Bash Patterns
```bash
# ✅ Good - Avoid unnecessary external commands
# Use parameter expansion instead of basename/dirname
full_path="/path/to/file.txt"
filename="${full_path##*/}"        # Instead of: basename "$full_path"
dirname="${full_path%/*}"          # Instead of: dirname "$full_path"
extension="${filename##*.}"        # Instead of: echo "$filename" | cut -d. -f2

# ✅ Good - Use built-in string operations
# Instead of: echo "$string" | tr '[:lower:]' '[:upper:]'
uppercase="${string^^}"

# Instead of: echo "$string" | sed 's/old/new/g'
replaced="${string//old/new}"

# ✅ Good - Efficient loops
# Process files in current directory
for file in ./*.txt; do
    [[ -f "${file}" ]] || continue  # Skip if no matches
    process_file "${file}"
done

# Read file line by line efficiently
while IFS= read -r line; do
    process_line "${line}"
done < "${input_file}"

# ✅ Good - Use associative arrays for lookups
declare -A valid_extensions
valid_extensions["txt"]=1
valid_extensions["log"]=1
valid_extensions["conf"]=1

check_extension() {
    local ext="$1"
    [[ -n "${valid_extensions[${ext}]:-}" ]]
}

# ❌ Bad - Inefficient patterns
# Don't use cat for single files
while IFS= read -r line; do  # Good
    echo "${line}"
done < "${file}"

cat "${file}" | while IFS= read -r line; do  # Bad - useless cat
    echo "${line}"
done
```

## Final Checklist

### Bash Script Quality Checklist
- [ ] Proper shebang line
- [ ] `set -euo pipefail` for error handling
- [ ] All variables properly quoted
- [ ] Input validation implemented
- [ ] Error handling with meaningful messages
- [ ] Cleanup/trap handlers for resources
- [ ] Local variables in functions
- [ ] Consistent naming conventions
- [ ] No external commands for built-in operations
- [ ] Proper exit codes
- [ ] Logging system implemented
- [ ] Script tested with various inputs
- [ ] ShellCheck passes without warnings
- [ ] Documentation for complex functions