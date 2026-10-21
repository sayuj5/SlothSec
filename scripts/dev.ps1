# SlothSec Local Launch Script
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "         Launching SlothSec Full-Stack           " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $WorkspaceRoot ".venv\Scripts\python.exe"

Write-Host "Starting Backend FastAPI on http://127.0.0.1:8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory $WorkspaceRoot -PassThru

Write-Host "Starting Frontend Vite server on http://localhost:5173..." -ForegroundColor Green
$frontendDir = Join-Path $WorkspaceRoot "frontend"
$frontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $frontendDir -PassThru

Write-Host ""
Write-Host "SlothSec running at:" -ForegroundColor Cyan
Write-Host "  Frontend Dashboard : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API & Docs : http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  Ollama Local Engine: http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C or close this terminal to stop both servers." -ForegroundColor Yellow

try {
    Wait-Process -Id $backendJob.Id, $frontendJob.Id
} finally {
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
}
