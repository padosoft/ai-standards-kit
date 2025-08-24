# Debug Control Script for AI Standards Kit (PowerShell)
# Usage: .\debug-control.ps1 [enable|disable|status|verbose|performance|full]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Find settings file
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SettingsFile = Join-Path $ScriptDir ".." ".claude" "settings.json"

# Check if settings file exists
if (-not (Test-Path $SettingsFile)) {
    Write-Host "Error: Settings file not found at $SettingsFile" -ForegroundColor Red
    Write-Host "Please run this script from the ai-standards-kit directory" -ForegroundColor Yellow
    exit 1
}

# Load current settings
$settings = Get-Content $SettingsFile | ConvertFrom-Json

switch ($Command) {
    "enable" {
        Write-Host "🔍 Enabling debug mode..." -ForegroundColor Cyan
        $settings.debug_mode.enabled = $true
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
        Write-Host "✅ Debug mode enabled" -ForegroundColor Green
    }
    
    "disable" {
        Write-Host "🔇 Disabling debug mode..." -ForegroundColor Cyan
        $settings.debug_mode.enabled = $false
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
        Write-Host "✅ Debug mode disabled" -ForegroundColor Green
    }
    
    "verbose" {
        Write-Host "📝 Enabling verbose routing..." -ForegroundColor Cyan
        $settings.debug_mode.enabled = $true
        $settings.debug_mode.verbose_routing = $true
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
        Write-Host "✅ Verbose routing enabled" -ForegroundColor Green
    }
    
    "performance" {
        Write-Host "⚡ Enabling performance monitoring..." -ForegroundColor Cyan
        $settings.debug_mode.enabled = $true
        $settings.debug_mode.show_execution_summary = $true
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
        Write-Host "✅ Performance monitoring enabled" -ForegroundColor Green
    }
    
    "full" {
        Write-Host "🚀 Enabling full debug mode (all options)..." -ForegroundColor Cyan
        $settings.debug_mode.enabled = $true
        $settings.debug_mode.verbose_routing = $true
        $settings.debug_mode.show_stack_detection = $true
        $settings.debug_mode.show_agent_selection = $true
        $settings.debug_mode.show_guide_loading = $true
        $settings.debug_mode.show_quality_gates = $true
        $settings.debug_mode.show_execution_summary = $true
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile -Encoding UTF8
        Write-Host "✅ Full debug mode enabled" -ForegroundColor Green
    }
    
    "status" {
        Write-Host "📊 Current debug mode status:" -ForegroundColor Cyan
        $settings.debug_mode | ConvertTo-Json -Depth 5 | Write-Host
    }
    
    "reports" {
        Write-Host "📋 Recent debug reports:" -ForegroundColor Cyan
        $reportsDir = Join-Path (Split-Path $SettingsFile) "debug-reports"
        if (Test-Path $reportsDir) {
            Get-ChildItem "$reportsDir\*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object {
                Write-Host $_.Name -ForegroundColor Yellow
            }
        } else {
            Write-Host "No debug reports directory found" -ForegroundColor Yellow
        }
    }
    
    "clean" {
        Write-Host "🧹 Cleaning old debug reports (keeping last 20)..." -ForegroundColor Cyan
        $reportsDir = Join-Path (Split-Path $SettingsFile) "debug-reports"
        if (Test-Path $reportsDir) {
            $files = Get-ChildItem "$reportsDir\*.md" | Sort-Object LastWriteTime -Descending
            if ($files.Count -gt 20) {
                $files | Select-Object -Skip 20 | Remove-Item -Force
                Write-Host "✅ Cleanup completed" -ForegroundColor Green
            } else {
                Write-Host "No cleanup needed (less than 20 reports)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "No debug reports to clean" -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host "🔧 AI Debug Control (PowerShell)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage: .\debug-control.ps1 [command]" -ForegroundColor White
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  enable      - Enable basic debug mode"
        Write-Host "  disable     - Disable debug mode completely"
        Write-Host "  verbose     - Enable verbose routing details"
        Write-Host "  performance - Enable performance monitoring"
        Write-Host "  full        - Enable all debug options"
        Write-Host "  status      - Show current debug configuration"
        Write-Host "  reports     - List recent debug reports"
        Write-Host "  clean       - Clean old debug reports"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\debug-control.ps1 enable"
        Write-Host "  .\debug-control.ps1 full"
        Write-Host "  .\debug-control.ps1 status"
        Write-Host ""
        Write-Host "Prompt Override:" -ForegroundColor Cyan
        Write-Host "  You can also enable debug directly in your prompt:"
        Write-Host '  ai "create controller --debug"'
        Write-Host '  ai "implementa auth con debug verboso"'
    }
}