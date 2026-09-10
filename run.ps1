# CyberScope Single-Command Local Application Launcher

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Get-Location
}
Set-Location $ScriptDir

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CyberScope -- From Security Evidence to Actionable Insight" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# Robust function to check if a TCP port is listening on localhost or 127.0.0.1 or ::1
function Test-PortListening([int]$Port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) { return $true }
    } catch {}

    try {
        $tcp1 = New-Object System.Net.Sockets.TcpClient
        $tcp1.Connect("127.0.0.1", $Port)
        $tcp1.Close()
        return $true
    } catch {}

    try {
        $tcp2 = New-Object System.Net.Sockets.TcpClient
        $tcp2.Connect("::1", $Port)
        $tcp2.Close()
        return $true
    } catch {}

    return $false
}

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
if (Test-PortListening 5432) {
    $PgStatus = "Detected (localhost:5432)"
} else {
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
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
        $OllamaStatus = "Detected (http://localhost:11434)"
    } catch {
        try {
            $res = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
            $OllamaStatus = "Detected (http://localhost:11434)"
        } catch {
            $OllamaStatus = "Not Detected (Local AI fallback active)"
        }
    }
}

Write-Host "PostgreSQL: $PgStatus" -ForegroundColor Green
Write-Host "Ollama:     $OllamaStatus" -ForegroundColor Green

# 5. Start Backend Process (FastAPI / Uvicorn on Port 8000)
$BackendProcess = $null
$BackendStartedByUs = $false

if (Test-PortListening 8000) {
    Write-Host "`nFastAPI Backend is already running (Port 8000)." -ForegroundColor Green
} else {
    Write-Host "`nStarting FastAPI Backend (Port 8000)..." -ForegroundColor Yellow
    $env:PYTHONPATH = Join-Path $ScriptDir "backend"
    $BackendProcess = Start-Process -FilePath $VenvPython `
        -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--reload", "--port", "8000" `
        -WorkingDirectory $ScriptDir `
        -PassThru `
        -WindowStyle Hidden
    $BackendStartedByUs = $true
}

# 6. Start Frontend Process (Vite / React on Port 5173)
$FrontendProcess = $null
$FrontendStartedByUs = $false

if (Test-PortListening 5173) {
    Write-Host "Vite Frontend is already running (Port 5173)..." -ForegroundColor Green
} else {
    Write-Host "Starting Vite Frontend (Port 5173)..." -ForegroundColor Yellow
    $FrontendProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm", "run", "dev" `
        -WorkingDirectory (Join-Path $ScriptDir "frontend") `
        -PassThru `
        -WindowStyle Hidden
    $FrontendStartedByUs = $true
}

# Wait for services to bind to ports
$startupTimeout = 15
$elapsed = 0
$frontendInitialized = $false
while ($elapsed -lt $startupTimeout) {
    $backendReady = Test-PortListening 8000
    $frontendReady = Test-PortListening 5173
    if ($frontendReady) { $frontendInitialized = $true }
    if ($backendReady -and $frontendReady) { break }
    Start-Sleep -Seconds 1
    $elapsed++
}

# 7. Display Status & URLs
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "CyberScope Operations Platform Starting..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend API:       http://localhost:8000" -ForegroundColor White
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "Frontend Portal:   http://localhost:5173" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# 8. Open Default Browser after delay
Start-Sleep -Seconds 2
try {
    Start-Process "http://localhost:5173"
} catch {}

Write-Host "`nCyberScope is running. Press Ctrl+C to stop services.`n" -ForegroundColor Gray

# 9. Clean Termination & Health Monitoring Loop
try {
    $consecutiveFailuresFrontend = 0
    while ($true) {
        # Check backend health if started by script
        if ($BackendStartedByUs -and $BackendProcess -and $BackendProcess.HasExited -and -not (Test-PortListening 8000)) {
            Write-Host "[WARNING] Backend process stopped." -ForegroundColor Red
            break
        }

        # Check frontend health (port 5173 responsiveness)
        $isFrontendListening = Test-PortListening 5173
        if ($isFrontendListening) {
            $frontendInitialized = $true
            $consecutiveFailuresFrontend = 0
        } elseif ($frontendInitialized) {
            $consecutiveFailuresFrontend++
            if ($consecutiveFailuresFrontend -ge 3) {
                Write-Host "[WARNING] Frontend process stopped." -ForegroundColor Red
                break
            }
        }

        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nStopping CyberScope services..." -ForegroundColor Yellow
    if ($BackendStartedByUs -and $BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendStartedByUs) {
        try {
            $conns = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
            foreach ($conn in $conns) {
                if ($conn.OwningProcess -and $conn.OwningProcess -gt 0) {
                    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {}
        if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
            Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "CyberScope services stopped cleanly." -ForegroundColor Green
}
