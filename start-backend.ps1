$ErrorActionPreference = "Stop"

Write-Host "[1/3] Checking MongoDB service..." -ForegroundColor Cyan
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($null -eq $mongoService) {
  Write-Error "MongoDB service was not found. Install it first (winget install -e --id MongoDB.Server)."
  exit 1
}

if ($mongoService.Status -ne "Running") {
  Write-Host "[2/3] Starting MongoDB service..." -ForegroundColor Cyan
  try {
    Start-Service -Name "MongoDB"
  } catch {
    Write-Error "Failed to start MongoDB service. Run PowerShell as Administrator and try again."
    exit 1
  }
} else {
  Write-Host "[2/3] MongoDB service is already running." -ForegroundColor Green
}

Write-Host "[3/3] Starting backend server..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\server"
node server.js
