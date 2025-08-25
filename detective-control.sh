#!/bin/bash

# Debugging Detective Control Script
# Unix/Linux version

set -e

CONFIG_PATH="ai/.claude/config/detective-settings.json"
PROVIDERS_PATH="ai/.claude/config/mcp-providers.json"
LOG_PATH="logs/detective.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

show_usage() {
    echo -e "${CYAN}🕵️  Debugging Detective Control Script${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 {start|stop|status|analyze|set-mode|health|logs} [options]"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo -e "${WHITE}  start                    Start the detective${NC}"
    echo -e "${WHITE}  stop                     Stop the detective${NC}"
    echo -e "${WHITE}  status                   Show current status${NC}"
    echo -e "${WHITE}  set-mode <mode>          Set operation mode${NC}"
    echo -e "${WHITE}  analyze                  Run immediate analysis${NC}"
    echo -e "${WHITE}  health                   Health check${NC}"
    echo -e "${WHITE}  logs [lines]             Show logs (default: 50 lines)${NC}"
    echo ""
    echo -e "${BLUE}Modes:${NC}"
    echo -e "${WHITE}  analysis   - Read-only analysis, no fixes applied${NC}"
    echo -e "${WHITE}  stage      - Can create PRs, requires approval${NC}"
    echo -e "${WHITE}  production - Can auto-fix issues${NC}"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo -e "${WHITE}  $0 start${NC}"
    echo -e "${WHITE}  $0 set-mode stage${NC}"
    echo -e "${WHITE}  $0 logs 100${NC}"
}

get_status() {
    if [[ -f "$CONFIG_PATH" ]]; then
        echo -e "${CYAN}🕵️  Debugging Detective Status${NC}"
        echo -e "${CYAN}================================${NC}"
        
        local enabled=$(jq -r '.detective.enabled' "$CONFIG_PATH")
        local mode=$(jq -r '.detective.mode' "$CONFIG_PATH")
        
        echo -e "${GREEN}Enabled: $enabled${NC}"
        echo -e "${YELLOW}Mode: $mode${NC}"
        echo ""
        
        echo -e "${BLUE}Active Agents:${NC}"
        jq -r '.detective.agents | to_entries[] | "  \(.key): \(if .value.enabled then "✅ Enabled" else "❌ Disabled" end)"' "$CONFIG_PATH"
        
        echo ""
        echo -e "${BLUE}Active Providers:${NC}"
        if [[ -f "$PROVIDERS_PATH" ]]; then
            jq -r '.active_providers | to_entries[] | "  \(.key): \(.value)"' "$PROVIDERS_PATH"
        fi
    else
        echo -e "${RED}❌ Detective not configured. Run '$0 start' to initialize.${NC}"
    fi
}

start_detective() {
    echo -e "${GREEN}🚀 Starting Debugging Detective...${NC}"
    
    if [[ ! -f "$CONFIG_PATH" ]]; then
        echo -e "${RED}❌ Configuration not found at $CONFIG_PATH${NC}"
        exit 1
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Update config to enable detective
    jq '.detective.enabled = true' "$CONFIG_PATH" > "$CONFIG_PATH.tmp" && mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
    
    echo -e "${GREEN}✅ Detective started successfully${NC}"
    echo -e "${BLUE}📊 Monitoring active. Check logs at: $LOG_PATH${NC}"
}

stop_detective() {
    echo -e "${YELLOW}🛑 Stopping Debugging Detective...${NC}"
    
    if [[ -f "$CONFIG_PATH" ]]; then
        jq '.detective.enabled = false' "$CONFIG_PATH" > "$CONFIG_PATH.tmp" && mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
        echo -e "${GREEN}✅ Detective stopped${NC}"
    fi
}

set_mode() {
    local new_mode="$1"
    
    if [[ -z "$new_mode" ]]; then
        echo -e "${RED}❌ Mode parameter required. Valid modes: analysis, stage, production${NC}"
        exit 1
    fi
    
    if [[ ! "$new_mode" =~ ^(analysis|stage|production)$ ]]; then
        echo -e "${RED}❌ Invalid mode. Valid modes: analysis, stage, production${NC}"
        exit 1
    fi
    
    if [[ -f "$CONFIG_PATH" ]]; then
        local old_mode=$(jq -r '.detective.mode' "$CONFIG_PATH")
        jq ".detective.mode = \"$new_mode\"" "$CONFIG_PATH" > "$CONFIG_PATH.tmp" && mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
        
        echo -e "${GREEN}🔄 Mode changed: $old_mode → $new_mode${NC}"
        echo ""
        echo -e "${BLUE}Mode Capabilities:${NC}"
        jq -r ".detective.operation_modes.\"$new_mode\" | \"  Can Fix: \(.can_fix)\n  Can Create PR: \(.can_create_pr)\n  Requires Approval: \(.requires_approval)\"" "$CONFIG_PATH"
    fi
}

start_analysis() {
    echo -e "${CYAN}🔍 Starting immediate analysis...${NC}"
    echo -e "${BLUE}📊 Analysis started. Results will be available in logs.${NC}"
    echo -e "${YELLOW}💡 Use '$0 logs' to monitor progress.${NC}"
}

show_health() {
    echo -e "${CYAN}🏥 Detective Health Check${NC}"
    echo -e "${CYAN}========================${NC}"
    
    # Check configuration files
    if [[ -f "$CONFIG_PATH" ]]; then
        echo -e "${GREEN}Configuration: ✅${NC}"
    else
        echo -e "${RED}Configuration: ❌${NC}"
    fi
    
    if [[ -f "$PROVIDERS_PATH" ]]; then
        echo -e "${GREEN}Providers Config: ✅${NC}"
    else
        echo -e "${RED}Providers Config: ❌${NC}"
    fi
    
    # Check required environment variables
    echo ""
    echo -e "${BLUE}Environment Variables:${NC}"
    local env_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "ELASTICSEARCH_URL")
    
    for env_var in "${env_vars[@]}"; do
        if [[ -n "${!env_var}" ]]; then
            echo -e "${GREEN}  $env_var: ✅${NC}"
        else
            echo -e "${RED}  $env_var: ❌${NC}"
        fi
    done
    
    # Check agent files
    echo ""
    echo -e "${BLUE}Agent Files:${NC}"
    local agent_files=(
        "ai/.claude/agents/detective/debugging-detective.md"
        "ai/.claude/agents/detective/error-triage.md"
        "ai/.claude/agents/detective/perf-doctor.md"
        "ai/.claude/agents/detective/sql-surgeon.md"
    )
    
    for file in "${agent_files[@]}"; do
        local filename=$(basename "$file")
        if [[ -f "$file" ]]; then
            echo -e "${GREEN}  $filename: ✅${NC}"
        else
            echo -e "${RED}  $filename: ❌${NC}"
        fi
    done
}

show_logs() {
    local lines="${1:-50}"
    
    if [[ -f "$LOG_PATH" ]]; then
        echo -e "${CYAN}📋 Detective Logs (last $lines lines)${NC}"
        echo -e "${CYAN}======================================${NC}"
        tail -n "$lines" "$LOG_PATH"
    else
        echo -e "${YELLOW}📋 No logs found at $LOG_PATH${NC}"
        echo -e "${BLUE}💡 Logs will appear after starting the detective.${NC}"
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed. Please install jq first.${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    echo "  CentOS/RHEL: sudo yum install jq"
    exit 1
fi

# Main script logic
case "${1:-}" in
    start)
        start_detective
        ;;
    stop)
        stop_detective
        ;;
    status)
        get_status
        ;;
    analyze)
        start_analysis
        ;;
    set-mode)
        set_mode "$2"
        ;;
    health)
        show_health
        ;;
    logs)
        show_logs "$2"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: ${1:-}${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac