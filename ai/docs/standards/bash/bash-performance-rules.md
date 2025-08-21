# Bash Performance Rules

> **Extends**: `/docs/standards/global/performance-rules.md`
> 
> This document provides **Bash-specific** performance optimizations and patterns. Apply these shell-specific optimizations while following global performance principles.

## Built-in vs External Commands

### Prefer Shell Built-ins
```bash
# ✅ Good - Use built-in parameter expansion
filename="${path##*/}"        # Instead of: basename "$path"
dirname="${path%/*}"          # Instead of: dirname "$path"
extension="${file##*.}"       # Instead of: echo "$file" | cut -d. -f2
no_extension="${file%.*}"     # Instead of: echo "$file" | rev | cut -d. -f2- | rev

# ✅ Good - String operations with parameter expansion
uppercase="${string^^}"       # Instead of: echo "$string" | tr '[:lower:]' '[:upper:]'
lowercase="${string,,}"       # Instead of: echo "$string" | tr '[:upper:]' '[:lower:]'
replaced="${string//old/new}" # Instead of: echo "$string" | sed 's/old/new/g'
trimmed="${string## }"        # Instead of: echo "$string" | sed 's/^ *//'

# ✅ Good - Length and substring operations
length="${#string}"           # Instead of: echo "$string" | wc -c
substring="${string:5:10}"    # Instead of: echo "$string" | cut -c6-15

# ✅ Good - Array operations
array_length="${#array[@]}"   # Instead of: echo "${array[@]}" | wc -w
```

### Avoid Unnecessary Subshells
```bash
# ✅ Good - Direct variable assignment
current_dir="$PWD"           # Instead of: current_dir="$(pwd)"
timestamp="$(date +%s)"      # Only when you need command substitution

# ✅ Good - Use here-strings instead of echo pipes
while read -r line; do
    process_line "$line"
done <<< "$variable"         # Instead of: echo "$variable" | while read...

# ✅ Good - Use here-documents for multi-line output
cat << 'EOF' > config.txt    # Instead of multiple echo commands
setting1=value1
setting2=value2
setting3=value3
EOF
```

## Efficient Loop Patterns

### File Processing Loops
```bash
# ✅ Good - Process files efficiently
for file in /path/to/files/*.txt; do
    [[ -f "$file" ]] || continue  # Handle empty glob
    process_file "$file"
done

# ✅ Good - Read file line by line (memory efficient)
while IFS= read -r line || [[ -n "$line" ]]; do
    process_line "$line"
done < "$filename"

# ✅ Good - Process command output
while IFS= read -r -d '' file; do
    process_file "$file"
done < <(find /path -name "*.txt" -print0)

# ❌ Bad - Inefficient file reading
for line in $(cat "$filename"); do  # Loads entire file, word splits
    process_line "$line"
done

# ❌ Bad - Useless use of cat
cat "$filename" | while read -r line; do  # Unnecessary process
    process_line "$line"
done
```

### Array Processing
```bash
# ✅ Good - Efficient array operations
files=(/path/to/*.txt)

# Check if array has elements
if [[ ${#files[@]} -gt 0 && -f "${files[0]}" ]]; then
    for file in "${files[@]}"; do
        process_file "$file"
    done
fi

# ✅ Good - Filter arrays in-place
filtered_files=()
for file in "${all_files[@]}"; do
    if [[ -f "$file" && -r "$file" ]]; then
        filtered_files+=("$file")
    fi
done

# ✅ Good - Associative arrays for fast lookups
declare -A lookup_table
for item in "${items[@]}"; do
    lookup_table["$item"]=1
done

# Fast lookup
if [[ -n "${lookup_table[$search_item]:-}" ]]; then
    echo "Found $search_item"
fi
```

## String Processing Optimization

### Pattern Matching Performance
```bash
# ✅ Good - Use case for multiple string comparisons
check_file_type() {
    local filename="$1"
    local extension="${filename##*.}"
    
    case "$extension" in
        jpg|jpeg|png|gif|bmp)
            echo "image"
            ;;
        mp4|avi|mov|mkv)
            echo "video"
            ;;
        txt|md|rst|org)
            echo "text"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# ✅ Good - Regex compilation (when using repeatedly)
readonly EMAIL_REGEX='^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

validate_emails() {
    local emails=("$@")
    local valid_count=0
    
    for email in "${emails[@]}"; do
        if [[ "$email" =~ $EMAIL_REGEX ]]; then
            ((valid_count++))
        fi
    done
    
    echo "$valid_count"
}

# ✅ Good - Efficient string replacement
clean_filename() {
    local filename="$1"
    
    # Remove multiple unwanted characters at once
    filename="${filename//[[:space:]\/\\:*?\"<>|]/}"
    
    # Replace sequences of dots with single dot
    filename="${filename//+(.)/.}"
    
    echo "$filename"
}
```

## Command Optimization

### Reduce External Command Calls
```bash
# ✅ Good - Batch operations
process_multiple_files() {
    local files=("$@")
    
    # Group operations to minimize external calls
    # Instead of calling 'file' for each file individually
    file "${files[@]}" | while IFS=': ' read -r filename filetype; do
        process_by_type "$filename" "$filetype"
    done
}

# ✅ Good - Use command grouping
backup_files() {
    local source_dir="$1"
    local backup_dir="$2"
    
    # Group commands to reduce overhead
    {
        echo "Starting backup at $(date)"
        tar -czf "$backup_dir/backup-$(date +%Y%m%d).tar.gz" -C "$source_dir" .
        echo "Backup completed at $(date)"
    } >> "$backup_dir/backup.log"
}

# ✅ Good - Optimize find operations
find_and_process() {
    local search_dir="$1"
    
    # Use find's -exec to process in batches
    find "$search_dir" -name "*.log" -mtime +7 -exec rm -f {} +
    
    # Or use find with while loop for complex processing
    find "$search_dir" -name "*.txt" -print0 | while IFS= read -r -d '' file; do
        if [[ -s "$file" ]]; then  # Only process non-empty files
            process_text_file "$file"
        fi
    done
}
```

## Memory Management

### Efficient Variable Handling
```bash
# ✅ Good - Unset large variables when done
process_large_dataset() {
    local dataset_file="$1"
    local large_array=()
    
    # Read data into array
    while IFS= read -r line; do
        large_array+=("$line")
    done < "$dataset_file"
    
    # Process data
    for item in "${large_array[@]}"; do
        process_item "$item"
    done
    
    # Free memory
    unset large_array
}

# ✅ Good - Stream processing for large files
process_large_file_streaming() {
    local input_file="$1"
    local output_file="$2"
    
    # Process line by line without loading entire file
    while IFS= read -r line || [[ -n "$line" ]]; do
        processed_line="$(transform_line "$line")"
        echo "$processed_line" >> "$output_file"
    done < "$input_file"
}

# ✅ Good - Use local variables to limit scope
calculate_stats() {
    local -a numbers=("$@")
    local sum=0
    local count=${#numbers[@]}
    
    for num in "${numbers[@]}"; do
        ((sum += num))
    done
    
    local average=$((sum / count))
    echo "$average"
    # Variables automatically freed when function exits
}
```

## Process and Subprocess Optimization

### Minimize Process Creation
```bash
# ✅ Good - Use shell arithmetic instead of bc/expr
calculate() {
    local a="$1" b="$2"
    echo $((a * b + (a / 2)))  # Instead of: echo "$a * $b + ($a / 2)" | bc
}

# ✅ Good - Use built-in printf instead of external formatting
format_number() {
    local number="$1"
    printf "%08d\n" "$number"  # Instead of: echo "$number" | awk '{printf "%08d\n", $1}'
}

# ✅ Good - Efficient command substitution
get_process_count() {
    local process_name="$1"
    pgrep -c "$process_name" || echo "0"  # Single command instead of ps | grep | wc
}
```

### Parallel Processing
```bash
# ✅ Good - Background job management
process_files_parallel() {
    local files=("$@")
    local max_jobs=4
    local job_count=0
    local pids=()
    
    for file in "${files[@]}"; do
        # Wait if we've reached max jobs
        if [[ $job_count -ge $max_jobs ]]; then
            wait "${pids[0]}"  # Wait for oldest job
            pids=("${pids[@]:1}")  # Remove first PID
            ((job_count--))
        fi
        
        # Start new job
        process_single_file "$file" &
        pids+=($!)
        ((job_count++))
    done
    
    # Wait for remaining jobs
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
}

# ✅ Good - Use xargs for parallel processing
parallel_compress() {
    local source_dir="$1"
    local cpu_count
    cpu_count=$(nproc 2>/dev/null || echo 4)
    
    find "$source_dir" -name "*.txt" -print0 | \
    xargs -0 -n 1 -P "$cpu_count" gzip
}
```

## I/O Optimization

### Efficient File Operations
```bash
# ✅ Good - Minimize disk I/O
atomic_write() {
    local target_file="$1"
    local temp_file="${target_file}.tmp.$$"
    
    # Write to temporary file first
    {
        echo "Generated on $(date)"
        generate_config_data
    } > "$temp_file"
    
    # Atomic move (single I/O operation)
    mv "$temp_file" "$target_file"
}

# ✅ Good - Batch file operations
copy_files_efficiently() {
    local source_dir="$1"
    local dest_dir="$2"
    
    # Use tar for efficient copying of many small files
    (cd "$source_dir" && tar -cf - .) | (cd "$dest_dir" && tar -xf -)
    
    # Or use rsync for advanced features
    # rsync -av --progress "$source_dir/" "$dest_dir/"
}

# ✅ Good - Read large files in chunks
process_large_file_chunks() {
    local file="$1"
    local chunk_size=1024
    local buffer
    
    exec 3< "$file"
    while read -r -n "$chunk_size" buffer <&3; do
        process_chunk "$buffer"
    done
    exec 3<&-
}
```

## Network Performance

### Efficient Network Operations
```bash
# ✅ Good - Connection reuse with curl
download_multiple_files() {
    local base_url="$1"
    shift
    local files=("$@")
    
    # Use curl with connection reuse
    local curl_opts=(
        --parallel
        --parallel-max 5
        --connect-timeout 10
        --max-time 60
        --retry 3
        --retry-delay 1
    )
    
    for file in "${files[@]}"; do
        echo "url = \"${base_url}/${file}\""
        echo "output = \"${file}\""
        echo ""
    done | curl "${curl_opts[@]}" --config -
}

# ✅ Good - Efficient health checks
check_service_health() {
    local services=("$@")
    local timeout=5
    
    # Check multiple services in parallel
    for service in "${services[@]}"; do
        (
            if timeout "$timeout" bash -c "</dev/tcp/${service}/80" 2>/dev/null; then
                echo "$service: UP"
            else
                echo "$service: DOWN"
            fi
        ) &
    done
    
    wait  # Wait for all checks to complete
}
```

## Performance Monitoring

### Script Performance Measurement
```bash
# ✅ Good - Time critical operations
time_operation() {
    local operation_name="$1"
    shift
    local start_time end_time duration
    
    echo "Starting: $operation_name"
    start_time=$(date +%s.%N)
    
    "$@"  # Execute the operation
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    printf "Completed: %s (%.3f seconds)\n" "$operation_name" "$duration"
}

# ✅ Good - Memory usage monitoring
monitor_memory() {
    local script_pid=$$
    
    # Log memory usage at regular intervals
    while kill -0 $script_pid 2>/dev/null; do
        local mem_usage
        mem_usage=$(ps -o rss= -p $script_pid 2>/dev/null)
        if [[ -n "$mem_usage" ]]; then
            printf "[%s] Memory: %d KB\n" "$(date)" "$mem_usage" >&2
        fi
        sleep 10
    done &
}

# ✅ Good - Resource limits
set_performance_limits() {
    # Set memory limit (100MB)
    ulimit -v 102400
    
    # Set CPU time limit (300 seconds)
    ulimit -t 300
    
    # Set maximum file size (50MB)
    ulimit -f 51200
    
    # Set maximum number of processes
    ulimit -u 50
}
```

## Performance Testing

### Benchmark Functions
```bash
# ✅ Good - Compare different implementations
benchmark_string_operations() {
    local test_string="The quick brown fox jumps over the lazy dog"
    local iterations=1000
    
    # Test parameter expansion
    time_operation "Parameter expansion" bash -c "
        for ((i=0; i<$iterations; i++)); do
            result=\"\${test_string^^}\"
        done
    "
    
    # Test external command
    time_operation "External tr command" bash -c "
        for ((i=0; i<$iterations; i++)); do
            result=\$(echo \"$test_string\" | tr '[:lower:]' '[:upper:]')
        done
    "
}

# ✅ Good - Load testing for scripts
load_test_script() {
    local script="$1"
    local concurrent_processes=10
    local iterations_per_process=100
    local pids=()
    
    echo "Starting load test: $concurrent_processes processes, $iterations_per_process iterations each"
    
    for ((p=0; p<concurrent_processes; p++)); do
        (
            for ((i=0; i<iterations_per_process; i++)); do
                "$script" >/dev/null 2>&1
            done
        ) &
        pids+=($!)
    done
    
    # Wait for all processes and measure time
    local start_time end_time
    start_time=$(date +%s)
    
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    local total_operations=$((concurrent_processes * iterations_per_process))
    local ops_per_second=$((total_operations / total_time))
    
    echo "Load test completed: $ops_per_second operations/second"
}
```

## Performance Checklist

### Bash Performance Validation
- [ ] Use shell built-ins instead of external commands where possible
- [ ] Avoid unnecessary subshells and command substitutions
- [ ] Use efficient loop patterns for file and array processing
- [ ] Implement streaming processing for large datasets
- [ ] Minimize process creation and external command calls
- [ ] Use associative arrays for fast lookups
- [ ] Implement proper memory management with unset
- [ ] Use parallel processing for independent operations
- [ ] Optimize I/O operations with batching and atomic writes
- [ ] Set appropriate resource limits
- [ ] Monitor memory and CPU usage during execution
- [ ] Benchmark critical operations
- [ ] Profile scripts to identify bottlenecks
- [ ] Use connection reuse for network operations
- [ ] Implement efficient error handling that doesn't impact performance