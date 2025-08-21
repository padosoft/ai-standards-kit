# Bash Security Standards

> **Extends**: `/docs/standards/global/security-standards.md`
> 
> This document provides **Bash-specific** security implementations and patterns. Always follow the global security principles while applying these shell-specific protections.

## Command Injection Prevention

### Input Sanitization
```bash
# ✅ Good - Validate and sanitize all inputs
sanitize_filename() {
    local filename="$1"
    
    # Remove path traversal attempts
    filename="${filename//..\/}"
    filename="${filename//\.\.\\}"
    
    # Remove shell metacharacters
    filename="${filename//[;|&\$\`\\]/}"
    
    # Allow only safe characters
    if [[ ! "${filename}" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo "Error: Invalid filename characters" >&2
        return 1
    fi
    
    # Check length
    if [[ ${#filename} -gt 255 ]]; then
        echo "Error: Filename too long" >&2
        return 1
    fi
    
    echo "${filename}"
}

# ✅ Good - Safe command construction
execute_safe_command() {
    local command="$1"
    shift
    local -a args=("$@")
    
    # Whitelist allowed commands
    case "${command}" in
        "ls"|"cat"|"grep"|"find"|"sort"|"uniq")
            # Command is allowed
            ;;
        *)
            echo "Error: Command '${command}' not allowed" >&2
            return 1
            ;;
    esac
    
    # Execute with explicit arguments (no shell interpretation)
    "${command}" "${args[@]}"
}

# ❌ Bad - Direct user input in commands
process_file() {
    local user_input="$1"
    # NEVER DO THIS - vulnerable to command injection
    eval "ls ${user_input}"
    # or
    bash -c "cat ${user_input}"
}

# ✅ Good - Safe alternative
process_file_safe() {
    local filename="$1"
    
    # Validate filename
    if ! sanitize_filename "${filename}" >/dev/null; then
        return 1
    fi
    
    # Use directly without shell interpretation
    if [[ -f "${filename}" ]]; then
        cat "${filename}"
    else
        echo "Error: File not found" >&2
        return 1
    fi
}
```

### Path Traversal Protection
```bash
# ✅ Good - Secure path validation
validate_path_security() {
    local input_path="$1"
    local base_dir="$2"
    
    # Resolve to absolute path
    local real_path
    if ! real_path="$(realpath "${input_path}" 2>/dev/null)"; then
        echo "Error: Invalid path" >&2
        return 1
    fi
    
    # Ensure it's within base directory
    if [[ "${real_path}" != "${base_dir}"* ]]; then
        echo "Error: Path outside allowed directory" >&2
        return 1
    fi
    
    # Additional checks for suspicious patterns
    if [[ "${input_path}" =~ \.\./|\\\.\./ ]]; then
        echo "Error: Path traversal attempt detected" >&2
        return 1
    fi
    
    # Check for null bytes
    if [[ "${input_path}" =~ $'\0' ]]; then
        echo "Error: Null byte in path" >&2
        return 1
    fi
    
    echo "${real_path}"
    return 0
}

# ✅ Good - Safe file operations
read_file_securely() {
    local filename="$1"
    local base_dir="/var/app/data"
    
    local validated_path
    if ! validated_path="$(validate_path_security "${filename}" "${base_dir}")"; then
        return 1
    fi
    
    if [[ ! -f "${validated_path}" ]]; then
        echo "Error: File does not exist" >&2
        return 1
    fi
    
    # Check file permissions
    if [[ ! -r "${validated_path}" ]]; then
        echo "Error: No read permission" >&2
        return 1
    fi
    
    # Read file safely
    cat "${validated_path}"
}
```

## Environment Variable Security

### Secure Environment Handling
```bash
# ✅ Good - Environment variable validation
validate_environment() {
    local required_vars=("DATABASE_HOST" "API_KEY" "LOG_LEVEL")
    local sensitive_vars=("API_KEY" "DATABASE_PASSWORD" "JWT_SECRET")
    
    # Check required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            echo "Error: Required environment variable '${var}' not set" >&2
            return 1
        fi
    done
    
    # Validate sensitive variables are not logged
    for var in "${sensitive_vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            # Mask in process list
            export "${var}=[REDACTED]"
        fi
    done
    
    # Validate specific formats
    if [[ -n "${DATABASE_PORT:-}" ]] && ! [[ "${DATABASE_PORT}" =~ ^[0-9]+$ ]]; then
        echo "Error: DATABASE_PORT must be numeric" >&2
        return 1
    fi
    
    if [[ -n "${LOG_LEVEL:-}" ]] && ! [[ "${LOG_LEVEL}" =~ ^(DEBUG|INFO|WARN|ERROR)$ ]]; then
        echo "Error: Invalid LOG_LEVEL" >&2
        return 1
    fi
}

# ✅ Good - Secure credential handling
load_secrets() {
    local secrets_file="$1"
    
    # Check file exists and has proper permissions
    if [[ ! -f "${secrets_file}" ]]; then
        echo "Error: Secrets file not found" >&2
        return 1
    fi
    
    # Check file permissions (should be 600 or 400)
    local perms
    perms="$(stat -c "%a" "${secrets_file}" 2>/dev/null || stat -f "%A" "${secrets_file}" 2>/dev/null)"
    if [[ "${perms}" != "600" && "${perms}" != "400" ]]; then
        echo "Error: Secrets file has insecure permissions (${perms})" >&2
        return 1
    fi
    
    # Load secrets without exposing in process list
    while IFS='=' read -r key value || [[ -n "${key}" ]]; do
        # Skip comments and empty lines
        [[ "${key}" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${key// }" ]] && continue
        
        # Validate key format
        if ! [[ "${key}" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
            echo "Error: Invalid secret key format: ${key}" >&2
            continue
        fi
        
        # Export without showing value
        export "${key}=${value}"
        
    done < "${secrets_file}"
}

# ✅ Good - Environment cleanup
cleanup_environment() {
    local sensitive_vars=("PASSWORD" "SECRET" "KEY" "TOKEN")
    
    # Unset sensitive variables
    for pattern in "${sensitive_vars[@]}"; do
        for var in $(compgen -v | grep -i "${pattern}"); do
            unset "${var}"
        done
    done
}
```

## Temporary File Security

### Secure Temporary Files
```bash
# ✅ Good - Secure temporary file creation
create_secure_temp_file() {
    local template="${1:-temp.XXXXXX}"
    local temp_file
    
    # Create with secure permissions (600)
    if ! temp_file="$(mktemp -t "${template}")"; then
        echo "Error: Failed to create temporary file" >&2
        return 1
    fi
    
    # Ensure restrictive permissions
    chmod 600 "${temp_file}"
    
    # Register for cleanup
    register_temp_file "${temp_file}"
    
    echo "${temp_file}"
}

create_secure_temp_dir() {
    local template="${1:-tempdir.XXXXXX}"
    local temp_dir
    
    if ! temp_dir="$(mktemp -d -t "${template}")"; then
        echo "Error: Failed to create temporary directory" >&2
        return 1
    fi
    
    # Secure permissions (700)
    chmod 700 "${temp_dir}"
    
    # Register for cleanup
    register_temp_dir "${temp_dir}"
    
    echo "${temp_dir}"
}

# ✅ Good - Secure temporary file usage
process_sensitive_data() {
    local input_file="$1"
    local temp_file
    
    # Create secure temporary file
    if ! temp_file="$(create_secure_temp_file "sensitive.XXXXXX")"; then
        return 1
    fi
    
    # Process data
    {
        echo "# Processed on $(date)"
        process_data < "${input_file}"
    } > "${temp_file}"
    
    # Use processed data
    validate_output "${temp_file}"
    
    # Secure deletion (overwrite before removal)
    shred -vfz -n 3 "${temp_file}" 2>/dev/null || {
        # Fallback for systems without shred
        dd if=/dev/zero of="${temp_file}" bs=1M count=10 2>/dev/null
        rm -f "${temp_file}"
    }
}

# ❌ Bad - Insecure temporary files
process_data_insecure() {
    local temp_file="/tmp/data_$$"  # Predictable name
    
    echo "sensitive data" > "${temp_file}"  # World readable by default
    process_file "${temp_file}"
    rm "${temp_file}"  # Data recoverable
}
```

## Process Security

### Privilege Management
```bash
# ✅ Good - Drop privileges when possible
drop_privileges() {
    local target_user="$1"
    local target_group="${2:-${target_user}}"
    
    # Check if running as root
    if [[ "$(id -u)" -ne 0 ]]; then
        echo "Error: Not running as root, cannot drop privileges" >&2
        return 1
    fi
    
    # Validate target user exists
    if ! id "${target_user}" >/dev/null 2>&1; then
        echo "Error: User '${target_user}' does not exist" >&2
        return 1
    fi
    
    # Change ownership of working directory if needed
    local work_dir="${PWD}"
    chown "${target_user}:${target_group}" "${work_dir}"
    
    # Drop privileges and re-execute
    exec su -s "${BASH}" "${target_user}" -c "$0 $*"
}

# ✅ Good - Secure process execution
execute_as_user() {
    local username="$1"
    shift
    local command=("$@")
    
    # Validate username
    if ! id "${username}" >/dev/null 2>&1; then
        echo "Error: User '${username}' does not exist" >&2
        return 1
    fi
    
    # Execute with clean environment
    su -l "${username}" -c "$(printf '%q ' "${command[@]}")"
}

# ✅ Good - Resource limits
set_resource_limits() {
    # Set memory limit (100MB)
    ulimit -v 102400
    
    # Set CPU time limit (5 minutes)
    ulimit -t 300
    
    # Set file size limit (10MB)
    ulimit -f 10240
    
    # Set number of processes
    ulimit -u 100
    
    # Set number of open files
    ulimit -n 1024
}
```

### Signal Security
```bash
# ✅ Good - Secure signal handling
setup_signal_handlers() {
    # Ignore dangerous signals in secure operations
    trap '' HUP INT QUIT TERM STOP TSTP
    
    # Custom handlers for cleanup
    trap 'secure_cleanup' EXIT
    trap 'handle_interrupt' USR1 USR2
}

secure_cleanup() {
    local exit_code=$?
    
    # Restore signal handlers
    trap - HUP INT QUIT TERM STOP TSTP EXIT USR1 USR2
    
    # Clear sensitive variables
    cleanup_environment
    
    # Secure temp file cleanup
    secure_temp_cleanup
    
    exit "${exit_code}"
}

handle_interrupt() {
    echo "Received signal, performing secure shutdown..." >&2
    secure_cleanup
}

# ✅ Good - Critical section protection
critical_section() {
    local operation="$1"
    shift
    
    # Block signals during critical operations
    trap '' INT TERM
    
    # Execute operation
    if ! "${operation}" "$@"; then
        # Restore handlers and exit
        trap - INT TERM
        return 1
    fi
    
    # Restore signal handlers
    trap - INT TERM
    return 0
}
```

## Network Security

### Secure Network Operations
```bash
# ✅ Good - Secure HTTP requests
secure_http_request() {
    local url="$1"
    local method="${2:-GET}"
    local timeout="${3:-30}"
    local max_redirects="${4:-3}"
    
    # Validate URL format
    if ! [[ "${url}" =~ ^https?://[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})(:[0-9]+)?(/.*)?$ ]]; then
        echo "Error: Invalid URL format" >&2
        return 1
    fi
    
    # Force HTTPS in production
    if [[ "${ENVIRONMENT:-}" == "production" && "${url}" =~ ^http:// ]]; then
        echo "Error: HTTPS required in production" >&2
        return 1
    fi
    
    # Secure curl options
    local curl_opts=(
        --fail                    # Fail on HTTP errors
        --silent                  # Don't show progress
        --show-error             # Show errors
        --location               # Follow redirects
        --max-redirs "${max_redirects}"
        --max-time "${timeout}"
        --user-agent "SecureApp/1.0"
        --proto "=http,https"    # Only allow HTTP/HTTPS
        --tlsv1.2               # Minimum TLS version
        --cert-status           # Verify certificate status
    )
    
    # Add authentication if available
    if [[ -n "${API_TOKEN:-}" ]]; then
        curl_opts+=(--header "Authorization: Bearer ${API_TOKEN}")
    fi
    
    # Execute request
    curl "${curl_opts[@]}" -X "${method}" "${url}"
}

# ✅ Good - Network input validation
validate_network_input() {
    local input="$1"
    local type="$2"
    
    case "${type}" in
        "hostname")
            # Allow only valid hostname characters
            [[ "${input}" =~ ^[a-zA-Z0-9.-]+$ ]] && [[ ${#input} -le 253 ]]
            ;;
        "ip4")
            if [[ "${input}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
                IFS='.' read -ra octets <<< "${input}"
                for octet in "${octets[@]}"; do
                    [[ "${octet}" -ge 0 && "${octet}" -le 255 ]] || return 1
                done
            else
                return 1
            fi
            ;;
        "port")
            [[ "${input}" =~ ^[0-9]+$ ]] && [[ "${input}" -ge 1 && "${input}" -le 65535 ]]
            ;;
        "url")
            [[ "${input}" =~ ^https?://[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})(:[0-9]+)?(/[^[:space:]]*)?$ ]]
            ;;
        *)
            return 1
            ;;
    esac
}

# ✅ Good - Secure download with verification
secure_download() {
    local url="$1"
    local output_file="$2"
    local expected_hash="$3"
    local hash_type="${4:-sha256}"
    
    # Validate inputs
    if ! validate_network_input "${url}" "url"; then
        echo "Error: Invalid URL" >&2
        return 1
    fi
    
    # Create temporary file for download
    local temp_file
    if ! temp_file="$(create_secure_temp_file)"; then
        return 1
    fi
    
    # Download to temporary location
    if ! secure_http_request "${url}" > "${temp_file}"; then
        echo "Error: Download failed" >&2
        return 1
    fi
    
    # Verify hash if provided
    if [[ -n "${expected_hash}" ]]; then
        local actual_hash
        case "${hash_type}" in
            "sha256")
                actual_hash="$(sha256sum "${temp_file}" | cut -d' ' -f1)"
                ;;
            "sha1")
                actual_hash="$(sha1sum "${temp_file}" | cut -d' ' -f1)"
                ;;
            "md5")
                actual_hash="$(md5sum "${temp_file}" | cut -d' ' -f1)"
                ;;
            *)
                echo "Error: Unsupported hash type" >&2
                return 1
                ;;
        esac
        
        if [[ "${actual_hash}" != "${expected_hash}" ]]; then
            echo "Error: Hash verification failed" >&2
            echo "Expected: ${expected_hash}" >&2
            echo "Actual:   ${actual_hash}" >&2
            return 1
        fi
    fi
    
    # Move to final location
    mv "${temp_file}" "${output_file}"
    chmod 644 "${output_file}"
}
```

## Logging Security

### Secure Logging
```bash
# ✅ Good - Security-aware logging
secure_log() {
    local level="$1"
    local message="$2"
    local component="${3:-MAIN}"
    
    # Sanitize message to remove sensitive data
    local sanitized_message
    sanitized_message="$(sanitize_log_message "${message}")"
    
    # Add security context
    local log_entry
    log_entry="[$(date -Iseconds)] [${level}] [${component}] [PID:$$] [UID:$(id -u)] ${sanitized_message}"
    
    # Write to secure log file
    local log_file="${SECURE_LOG_FILE:-/var/log/secure-app.log}"
    
    # Ensure log directory exists with proper permissions
    local log_dir="${log_file%/*}"
    if [[ ! -d "${log_dir}" ]]; then
        mkdir -p "${log_dir}"
        chmod 750 "${log_dir}"
    fi
    
    # Append to log with lock
    (
        flock 200
        echo "${log_entry}" >> "${log_file}"
        chmod 640 "${log_file}"
    ) 200>"${log_file}.lock"
}

sanitize_log_message() {
    local message="$1"
    
    # Remove common sensitive patterns
    local patterns=(
        's/password[[:space:]]*[:=][[:space:]]*[^[:space:]]*/<PASSWORD_REDACTED>/gi'
        's/token[[:space:]]*[:=][[:space:]]*[^[:space:]]*/<TOKEN_REDACTED>/gi'
        's/key[[:space:]]*[:=][[:space:]]*[^[:space:]]*/<KEY_REDACTED>/gi'
        's/secret[[:space:]]*[:=][[:space:]]*[^[:space:]]*/<SECRET_REDACTED>/gi'
        's/\b[0-9]{4}[[:space:]-]*[0-9]{4}[[:space:]-]*[0-9]{4}[[:space:]-]*[0-9]{4}\b/<CARD_REDACTED>/g'
        's/\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/<SSN_REDACTED>/g'
    )
    
    local sanitized="${message}"
    for pattern in "${patterns[@]}"; do
        sanitized="$(echo "${sanitized}" | sed -E "${pattern}")"
    done
    
    echo "${sanitized}"
}

# ✅ Good - Security event logging
log_security_event() {
    local event_type="$1"
    local description="$2"
    local severity="${3:-MEDIUM}"
    local user="${4:-$(whoami)}"
    local ip="${5:-$(who am i | awk '{print $5}' | tr -d '()')}"
    
    local security_log="${SECURITY_LOG_FILE:-/var/log/security-events.log}"
    local timestamp="$(date -Iseconds)"
    
    local event_data
    event_data="$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "event_type": "${event_type}",
  "severity": "${severity}",
  "description": "${description}",
  "user": "${user}",
  "pid": "$$",
  "ip": "${ip}",
  "host": "${HOSTNAME}"
}
EOF
    )"
    
    # Log to security file
    (
        flock 200
        echo "${event_data}" >> "${security_log}"
    ) 200>"${security_log}.lock"
    
    # Send alert for high severity events
    if [[ "${severity}" == "HIGH" || "${severity}" == "CRITICAL" ]]; then
        send_security_alert "${event_type}" "${description}" "${severity}"
    fi
}

send_security_alert() {
    local event_type="$1"
    local description="$2"
    local severity="$3"
    
    # Send to syslog
    logger -p auth.warning "SECURITY_EVENT: ${event_type} - ${description}"
    
    # Send email alert if configured
    if [[ -n "${SECURITY_EMAIL:-}" ]] && command -v mail >/dev/null; then
        {
            echo "Security Alert: ${event_type}"
            echo "Severity: ${severity}"
            echo "Description: ${description}"
            echo "Host: ${HOSTNAME}"
            echo "Time: $(date)"
        } | mail -s "Security Alert: ${event_type}" "${SECURITY_EMAIL}"
    fi
}
```

## Audit and Compliance

### Security Audit Functions
```bash
# ✅ Good - Security audit trail
audit_file_access() {
    local file_path="$1"
    local operation="$2"
    local user="${3:-$(whoami)}"
    
    log_security_event "FILE_ACCESS" "User ${user} performed ${operation} on ${file_path}" "LOW"
    
    # Check if file contains sensitive data
    if is_sensitive_file "${file_path}"; then
        log_security_event "SENSITIVE_FILE_ACCESS" "Access to sensitive file: ${file_path}" "MEDIUM"
    fi
}

is_sensitive_file() {
    local file_path="$1"
    local sensitive_patterns=(
        "password" "secret" "key" "token" "credential"
        "private" "confidential" "cert" "pem"
    )
    
    local basename="${file_path##*/}"
    local lowercase="${basename,,}"
    
    for pattern in "${sensitive_patterns[@]}"; do
        if [[ "${lowercase}" == *"${pattern}"* ]]; then
            return 0
        fi
    done
    
    return 1
}

# ✅ Good - Compliance checks
run_security_compliance_check() {
    local check_results=()
    
    echo "Running security compliance checks..."
    
    # Check file permissions
    if check_file_permissions; then
        check_results+=("PASS: File permissions")
    else
        check_results+=("FAIL: File permissions")
    fi
    
    # Check for hardcoded secrets
    if check_hardcoded_secrets; then
        check_results+=("PASS: No hardcoded secrets")
    else
        check_results+=("FAIL: Hardcoded secrets found")
    fi
    
    # Check log permissions
    if check_log_security; then
        check_results+=("PASS: Log security")
    else
        check_results+=("FAIL: Log security issues")
    fi
    
    # Report results
    echo "Security compliance check results:"
    for result in "${check_results[@]}"; do
        echo "  ${result}"
    done
    
    # Check if any failures
    local failures
    failures="$(printf '%s\n' "${check_results[@]}" | grep -c "FAIL:" || true)"
    
    if [[ "${failures}" -gt 0 ]]; then
        log_security_event "COMPLIANCE_FAILURE" "${failures} compliance checks failed" "HIGH"
        return 1
    fi
    
    return 0
}

check_file_permissions() {
    local config_files=("/etc/myapp/" "${HOME}/.myapp/")
    local errors=0
    
    for dir in "${config_files[@]}"; do
        if [[ -d "${dir}" ]]; then
            while IFS= read -r -d '' file; do
                local perms
                perms="$(stat -c "%a" "${file}" 2>/dev/null || stat -f "%A" "${file}" 2>/dev/null)"
                
                # Config files should not be world-readable
                if [[ "${perms: -1}" != "0" ]]; then
                    echo "Warning: ${file} is world-readable (${perms})" >&2
                    ((errors++))
                fi
            done < <(find "${dir}" -type f -print0)
        fi
    done
    
    return $((errors == 0))
}

check_hardcoded_secrets() {
    local script_files=("${BASH_SOURCE[0]}")
    local secret_patterns=(
        'password[[:space:]]*=[[:space:]]*"[^"]*"'
        'api[_-]?key[[:space:]]*=[[:space:]]*"[^"]*"'
        'secret[[:space:]]*=[[:space:]]*"[^"]*"'
        'token[[:space:]]*=[[:space:]]*"[^"]*"'
    )
    
    for file in "${script_files[@]}"; do
        for pattern in "${secret_patterns[@]}"; do
            if grep -qi "${pattern}" "${file}" 2>/dev/null; then
                echo "Warning: Possible hardcoded secret in ${file}" >&2
                return 1
            fi
        done
    done
    
    return 0
}
```

## Security Checklist

### Bash Security Validation
- [ ] All user inputs are validated and sanitized
- [ ] No eval() or bash -c with user input
- [ ] Path traversal protection implemented
- [ ] Temporary files created with secure permissions
- [ ] Sensitive variables are not exposed in process list
- [ ] Signal handlers properly secured
- [ ] Resource limits set appropriately
- [ ] Network requests use HTTPS in production
- [ ] Logging sanitizes sensitive data
- [ ] File operations validate paths and permissions
- [ ] No hardcoded secrets in scripts
- [ ] Error messages don't leak sensitive information
- [ ] Cleanup handlers remove temporary data
- [ ] Audit trail for sensitive operations
- [ ] Compliance checks implemented and passing