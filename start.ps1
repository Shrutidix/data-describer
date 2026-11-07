# ==============================================================================
# Data Describer — Full Stack Startup Script (Windows PowerShell)
# Starts FastAPI backend (port 8000) and React Vite frontend (port 5173) together
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Data Describer (Privacy-First Data Profiler)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

$PythonExe = "python.exe"
if (Test-Path "C:\Users\admin\AppData\Local\Programs\Python\Python313\python.exe") {
    $PythonExe = "C:\Users\admin\AppData\Local\Programs\Python\Python313\python.exe"
}

$DataDir = Join-Path $ScriptDir "data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
}

Write-Host "[1/2] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn app.main:app --port 8000 --host 127.0.0.1" -WorkingDirectory $BackendDir -PassThru

Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev" -WorkingDirectory $FrontendDir -PassThru

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   Data Describer is running!" -ForegroundColor Green
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor Yellow
Write-Host "   Backend  : http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "   API Docs : http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Gray

try {
    while (-not ($BackendProcess.HasExited -or $FrontendProcess.HasExited)) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    if ($BackendProcess -and -not $BackendProcess.HasExited) { Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($FrontendProcess -and -not $FrontendProcess.HasExited) { Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue }
}
