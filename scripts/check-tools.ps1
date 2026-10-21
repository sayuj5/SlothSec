# SlothSec Environment & Tools Pre-Flight Check Script
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SlothSec — Local Environment Verification    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

function Check-Tool {
    param (
        [string]$Name,
        [scriptblock]$Command
    )
    try {
        $result = & $Command
        Write-Host " [OK] $Name is installed: $result" -ForegroundColor Green
        return $true
    } catch {
        Write-Host " [MISSING] $Name not detected in PATH!" -ForegroundColor Red
        return $false
    }
}

$allGood = $true

$allGood = (Check-Tool -Name "Python" -Command { python --version }) -and $allGood
$allGood = (Check-Tool -Name "Node.js" -Command { node --version }) -and $allGood
$allGood = (Check-Tool -Name "npm" -Command { npm --version }) -and $allGood
$allGood = (Check-Tool -Name "Git" -Command { git --version }) -and $allGood
$allGood = (Check-Tool -Name "Ollama" -Command { (ollama --version).Split("`n")[0] }) -and $allGood
$allGood = (Check-Tool -Name "Semgrep" -Command { (semgrep --version).Trim() }) -and $allGood
$allGood = (Check-Tool -Name "OSV-Scanner" -Command { (osv-scanner --version).Split("`n")[0].Trim() }) -and $allGood
$allGood = (Check-Tool -Name "Gitleaks" -Command { (gitleaks version).Trim() }) -and $allGood

Write-Host "-------------------------------------------------" -ForegroundColor Gray
Write-Host "Verifying Local Ollama Connectivity & Models..." -ForegroundColor Yellow
try {
    $ollamaTags = curl.exe -s http://localhost:11434/api/tags
    if ($ollamaTags -match "qwen3:4b") {
        Write-Host " [OK] Ollama is online and model 'qwen3:4b' is ready!" -ForegroundColor Green
    } else {
        Write-Host " [WARN] Ollama is reachable, but 'qwen3:4b' was not found in local models." -ForegroundColor Yellow
        Write-Host " Run: ollama pull qwen3:4b" -ForegroundColor Cyan
    }
} catch {
    Write-Host " [ERROR] Cannot reach Ollama daemon at http://localhost:11434" -ForegroundColor Red
}

Write-Host "=================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "SlothSec pre-flight check PASSED. Environment ready!" -ForegroundColor Green
} else {
    Write-Host "Some tools require installation or PATH configuration." -ForegroundColor Yellow
}
