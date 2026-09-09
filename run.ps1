# CyberScope Single-Command Local Application Launcher

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Get-Location
}
Set-Location $ScriptDir

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CyberScope -- From Security Evidence to Actionable Insight" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify Virtual Environment
$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Python virtual environment (.venv) not found at: $VenvPython" -ForegroundColor Red
    Write-Host "Please ensure .venv is set up correctly." -ForegroundColor Yellow
    exit 1
}

# 2. Check Node & NPM
$NpmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $NpmPath) {
    Write-Host "[ERROR] Node.js / npm not found in system PATH." -ForegroundColor Red
    exit 1
}

# 3. Check PostgreSQL Connectivity (Port 5432)
$PgStatus = "Not Detected"
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("localhost", 5432)
    if ($tcp.Connected) {
        $PgStatus = "Detected (localhost:5432)"
        $tcp.Close()
    }
} catch {
    $PgStatus = "Warning: Port 5432 not reachable. (Ensure PostgreSQL is running)"
}

# 4. Check Ollama Status (Port 11434)
$OllamaStatus = "Not Detected (Local AI fallback active)"
try {
    $OllamaReq = [System.Net.WebRequest]::Create("http://localhost:11434/api/tags")
    $OllamaReq.Timeout = 2000
    $OllamaResp = $OllamaReq.GetResponse()
    if ($OllamaResp.StatusCode -eq [System.Net.HttpStatusCode]::OK) {
        $OllamaStatus = "Detected (http://localhost:11434)"
    }
    $OllamaResp.Close()
} catch {
    $OllamaStatus = "Not Detected (Local AI fallback active)"
}

Write-Host "PostgreSQL: $PgStatus" -ForegroundColor Green
Write-Host "Ollama:     $OllamaStatus" -ForegroundColor Green

# 5. Start Backend Process (FastAPI / Uvicorn on Port 8000)
Write-Host "`nStarting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
$env:PYTHONPATH = Join-Path $ScriptDir "backend"

$BackendProcess = Start-Process -FilePath $VenvPython `
    -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--reload", "--port", "8000" `
    -WorkingDirectory $ScriptDir `
    -PassThru `
    -WindowStyle Hidden

# 6. Start Frontend Process (Vite / React on Port 5173)
Write-Host "Starting Vite Frontend (Port 5173)..." -ForegroundColor Yellow
$FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm", "run", "dev" `
    -WorkingDirectory (Join-Path $ScriptDir "frontend") `
    -PassThru `
    -WindowStyle Hidden

# 7. Display Status & URLs
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "CyberScope Operations Platform Starting..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend API:       http://localhost:8000" -ForegroundColor White
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "Frontend Portal:   http://localhost:5173" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# 8. Open Default Browser after delay
Start-Sleep -Seconds 3
try {
    Start-Process "http://localhost:5173"
} catch {}

Write-Host "`nCyberScope is running. Press Ctrl+C to stop services.`n" -ForegroundColor Gray

# 9. Clean Termination Handler
try {
    while ($true) {
        if ($BackendProcess.HasExited) {
            Write-Host "[WARNING] Backend process stopped." -ForegroundColor Red
            break
        }
        if ($FrontendProcess.HasExited) {
            Write-Host "[WARNING] Frontend process stopped." -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nStopping CyberScope services..." -ForegroundColor Yellow
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
        # Kill cmd and node child processes of frontend
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "CyberScope services stopped cleanly." -ForegroundColor Green
}
