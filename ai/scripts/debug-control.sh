#!/bin/bash

# Debug Control Script for AI Standards Kit
# Usage: ./scripts/debug-control.sh [enable|disable|status|verbose|performance]

SETTINGS_FILE="ai/.claude/settings.json"
TEMP_FILE=$(mktemp)

case "$1" in
    "enable")
        echo "🔍 Enabling debug mode..."
        jq '.debug_mode.enabled = true' "$SETTINGS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ Debug mode enabled"
        ;;
    
    "disable")
        echo "🔇 Disabling debug mode..."
        jq '.debug_mode.enabled = false' "$SETTINGS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ Debug mode disabled"
        ;;
    
    "verbose")
        echo "📝 Enabling verbose routing..."
        jq '.debug_mode.enabled = true | .debug_mode.verbose_routing = true' "$SETTINGS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ Verbose routing enabled"
        ;;
    
    "performance")
        echo "⚡ Enabling performance monitoring..."
        jq '.debug_mode.enabled = true | .debug_mode.show_execution_summary = true' "$SETTINGS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ Performance monitoring enabled"
        ;;
    
    "full")
        echo "🚀 Enabling full debug mode (all options)..."
        jq '.debug_mode.enabled = true | 
            .debug_mode.verbose_routing = true | 
            .debug_mode.show_stack_detection = true | 
            .debug_mode.show_agent_selection = true | 
            .debug_mode.show_guide_loading = true | 
            .debug_mode.show_quality_gates = true | 
            .debug_mode.show_execution_summary = true' "$SETTINGS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$SETTINGS_FILE"
        echo "✅ Full debug mode enabled"
        ;;
    
    "status")
        echo "📊 Current debug mode status:"
        jq '.debug_mode' "$SETTINGS_FILE"
        ;;
    
    "reports")
        echo "📋 Recent debug reports:"
        if [ -d ".claude/debug-reports" ]; then
            ls -lt .claude/debug-reports/*.md 2>/dev/null | head -10
        else
            echo "No debug reports directory found"
        fi
        ;;
    
    "clean")
        echo "🧹 Cleaning old debug reports (keeping last 20)..."
        if [ -d ".claude/debug-reports" ]; then
            ls -t .claude/debug-reports/*.md 2>/dev/null | tail -n +21 | xargs rm -f
            echo "✅ Cleanup completed"
        else
            echo "No debug reports to clean"
        fi
        ;;
    
    *)
        echo "🔧 AI Debug Control"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  enable      - Enable basic debug mode"
        echo "  disable     - Disable debug mode completely"
        echo "  verbose     - Enable verbose routing details"
        echo "  performance - Enable performance monitoring"
        echo "  full        - Enable all debug options"
        echo "  status      - Show current debug configuration"
        echo "  reports     - List recent debug reports"
        echo "  clean       - Clean old debug reports"
        echo ""
        echo "Examples:"
        echo "  $0 enable && ai 'create user controller'"
        echo "  $0 verbose && ai 'implement payment system'"
        echo "  $0 status"
        ;;
esac