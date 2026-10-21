# SlothSec Setup Script for Windows PowerShell
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "      SlothSec — Automated Workspace Setup       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

# 1. Virtual environment setup
$VenvPython = Join-Path $WorkspaceRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python virtual environment in .venv..." -ForegroundColor Yellow
    python -m venv (Join-Path $WorkspaceRoot ".venv")
}

Write-Host "Installing backend Python dependencies..." -ForegroundColor Yellow
& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $WorkspaceRoot "backend\requirements.txt")

# 2. Frontend dependencies
$FrontendDir = Join-Path $WorkspaceRoot "frontend"
Write-Host "Installing frontend npm packages..." -ForegroundColor Yellow
Push-Location $FrontendDir
npm install
npm run build
Pop-Location

# 3. Initialize SQLite Database
Write-Host "Initializing SQLite database schema..." -ForegroundColor Yellow
& $VenvPython -c "import backend.app.models; from backend.app.database.session import init_db; init_db(); print('Database schema ready.')"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "SlothSec setup completed successfully!" -ForegroundColor Green
Write-Host "Launch development server with: .\scripts\dev.ps1" -ForegroundColor Cyan
