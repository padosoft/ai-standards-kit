# Debugging Detective Control Script
# PowerShell version for cross-platform compatibility

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "analyze", "set-mode", "health", "logs")]
    [string]$Action,
    
    [string]$Mode,
    [string]$Service,
    [int]$Lines = 50
)

$ConfigPath = "ai\.claude\config\detective-settings.json"
$LogPath = "logs\detective.log"

function Get-DetectiveStatus {
    if (Test-Path $ConfigPath) {
        $config = Get-Content $ConfigPath | ConvertFrom-Json
        Write-Host "🕵️  Debugging Detective Status" -ForegroundColor Cyan
        Write-Host "================================" -ForegroundColor Cyan
        Write-Host "Enabled: $($config.detective.enabled)" -ForegroundColor Green
        Write-Host "Mode: $($config.detective.mode)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Active Agents:" -ForegroundColor Blue
        foreach ($agent in $config.detective.agents.PSObject.Properties) {
            $status = if ($agent.Value.enabled) { "✅ Enabled" } else { "❌ Disabled" }
            Write-Host "  $($agent.Name): $status" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Active Providers:" -ForegroundColor Blue
        if (Test-Path "ai\.claude\config\mcp-providers.json") {
            $providers = Get-Content "ai\.claude\config\mcp-providers.json" | ConvertFrom-Json
            foreach ($provider in $providers.active_providers.PSObject.Properties) {
                Write-Host "  $($provider.Name): $($provider.Value)" -ForegroundColor White
            }
        }
    } else {
        Write-Host "❌ Detective not configured. Run 'detective-control.ps1 start' to initialize." -ForegroundColor Red
    }
}

function Start-Detective {
    Write-Host "🚀 Starting Debugging Detective..." -ForegroundColor Green
    
    if (!(Test-Path $ConfigPath)) {
        Write-Host "❌ Configuration not found at $ConfigPath" -ForegroundColor Red
        return
    }
    
    # Create logs directory if it doesn't exist
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # Update config to enable detective
    $config = Get-Content $ConfigPath | ConvertFrom-Json
    $config.detective.enabled = $true
    $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath
    
    Write-Host "✅ Detective started successfully" -ForegroundColor Green
    Write-Host "📊 Monitoring active. Check logs at: $LogPath" -ForegroundColor Blue
}

function Stop-Detective {
    Write-Host "🛑 Stopping Debugging Detective..." -ForegroundColor Yellow
    
    if (Test-Path $ConfigPath) {
        $config = Get-Content $ConfigPath | ConvertFrom-Json
        $config.detective.enabled = $false
        $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath
        Write-Host "✅ Detective stopped" -ForegroundColor Green
    }
}

function Set-DetectiveMode {
    param([string]$NewMode)
    
    if (!$NewMode) {
        Write-Host "❌ Mode parameter required. Valid modes: analysis, stage, production" -ForegroundColor Red
        return
    }
    
    if ($NewMode -notin @("analysis", "stage", "production")) {
        Write-Host "❌ Invalid mode. Valid modes: analysis, stage, production" -ForegroundColor Red
        return
    }
    
    if (Test-Path $ConfigPath) {
        $config = Get-Content $ConfigPath | ConvertFrom-Json
        $oldMode = $config.detective.mode
        $config.detective.mode = $NewMode
        $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath
        
        Write-Host "🔄 Mode changed: $oldMode → $NewMode" -ForegroundColor Green
        
        # Show mode capabilities
        $modeConfig = $config.detective.operation_modes.$NewMode
        Write-Host ""
        Write-Host "Mode Capabilities:" -ForegroundColor Blue
        Write-Host "  Can Fix: $($modeConfig.can_fix)" -ForegroundColor White
        Write-Host "  Can Create PR: $($modeConfig.can_create_pr)" -ForegroundColor White
        Write-Host "  Requires Approval: $($modeConfig.requires_approval)" -ForegroundColor White
    }
}

function Start-Analysis {
    Write-Host "🔍 Starting immediate analysis..." -ForegroundColor Cyan
    
    # This would trigger the detective orchestrator
    Write-Host "📊 Analysis started. Results will be available in logs." -ForegroundColor Blue
    Write-Host "💡 Use 'detective-control.ps1 logs' to monitor progress." -ForegroundColor Yellow
}

function Show-Health {
    Write-Host "🏥 Detective Health Check" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    # Check configuration files
    $configOK = Test-Path $ConfigPath
    $providersOK = Test-Path "ai\.claude\config\mcp-providers.json"
    
    Write-Host "Configuration: $(if ($configOK) { '✅' } else { '❌' })" -ForegroundColor $(if ($configOK) { 'Green' } else { 'Red' })
    Write-Host "Providers Config: $(if ($providersOK) { '✅' } else { '❌' })" -ForegroundColor $(if ($providersOK) { 'Green' } else { 'Red' })
    
    # Check required environment variables
    $requiredEnvs = @(
        "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME",
        "ELASTICSEARCH_URL"
    )
    
    Write-Host ""
    Write-Host "Environment Variables:" -ForegroundColor Blue
    foreach ($env in $requiredEnvs) {
        $exists = [Environment]::GetEnvironmentVariable($env) -ne $null
        Write-Host "  $env`: $(if ($exists) { '✅' } else { '❌' })" -ForegroundColor $(if ($exists) { 'Green' } else { 'Red' })
    }
    
    # Check agent files
    Write-Host ""
    Write-Host "Agent Files:" -ForegroundColor Blue
    $agentFiles = @(
        "ai\.claude\agents\detective\debugging-detective.md",
        "ai\.claude\agents\detective\error-triage.md",
        "ai\.claude\agents\detective\perf-doctor.md",
        "ai\.claude\agents\detective\sql-surgeon.md"
    )
    
    foreach ($file in $agentFiles) {
        $exists = Test-Path $file
        $filename = Split-Path $file -Leaf
        Write-Host "  $filename`: $(if ($exists) { '✅' } else { '❌' })" -ForegroundColor $(if ($exists) { 'Green' } else { 'Red' })
    }
}

function Show-Logs {
    param([int]$LineCount = 50)
    
    if (Test-Path $LogPath) {
        Write-Host "📋 Detective Logs (last $LineCount lines)" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Get-Content $LogPath -Tail $LineCount
    } else {
        Write-Host "📋 No logs found at $LogPath" -ForegroundColor Yellow
        Write-Host "💡 Logs will appear after starting the detective." -ForegroundColor Blue
    }
}

# Main script logic
switch ($Action.ToLower()) {
    "start" { Start-Detective }
    "stop" { Stop-Detective }
    "status" { Get-DetectiveStatus }
    "analyze" { Start-Analysis }
    "set-mode" { Set-DetectiveMode -NewMode $Mode }
    "health" { Show-Health }
    "logs" { Show-Logs -LineCount $Lines }
}

# Usage examples
if ($Action -eq "help") {
    Write-Host ""
    Write-Host "🕵️  Debugging Detective Control Script" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage Examples:" -ForegroundColor Blue
    Write-Host "  .\detective-control.ps1 start                    # Start the detective" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 stop                     # Stop the detective" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 status                   # Show current status" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 set-mode -Mode stage     # Set to stage mode" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 analyze                  # Run immediate analysis" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 health                   # Health check" -ForegroundColor White
    Write-Host "  .\detective-control.ps1 logs -Lines 100          # Show logs" -ForegroundColor White
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor Blue
    Write-Host "  analysis   - Read-only analysis, no fixes applied" -ForegroundColor White
    Write-Host "  stage      - Can create PRs, requires approval" -ForegroundColor White
    Write-Host "  production - Can auto-fix issues" -ForegroundColor White
}