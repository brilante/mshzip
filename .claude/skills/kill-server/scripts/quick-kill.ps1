# Kill Server Script (PowerShell)
# 프로젝트 웹서버를 찾아 종료하는 스크립트

param(
    [int[]]$Ports = @(5858, 3999),
    [switch]$Force
)

Write-Host " 프로젝트 웹서버 탐색 중..." -ForegroundColor Cyan
Write-Host ""

# .env에서 PORT 읽기
$envPath = Join-Path $PSScriptRoot "..\..\..\..\..\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "^PORT=(\d+)") {
        $envPort = [int]$Matches[1]
        $Ports = @($envPort) + $Ports | Select-Object -Unique
    }
}

Write-Host " 검색 포트: $($Ports -join ', ')" -ForegroundColor Gray
Write-Host ""

$killed = $false

foreach ($Port in $Ports) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

        if ($connection) {
            $pid = $connection.OwningProcess
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue

            Write-Host " 포트 $Port 에서 프로세스 발견:" -ForegroundColor Yellow
            Write-Host "   - PID: $pid" -ForegroundColor White
            Write-Host "   - 이름: $($process.ProcessName)" -ForegroundColor White
            Write-Host "   - 경로: $($process.Path)" -ForegroundColor White
            Write-Host ""

            # 정상 종료 시도
            Write-Host " 정상 종료 시도 중..." -ForegroundColor Gray

            if (-not $Force) {
                # Graceful shutdown
                Stop-Process -Id $pid -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 3
            }

            # 종료 확인
            $check = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

            if (-not $check) {
                Write-Host " 포트 $Port 서버가 정상 종료되었습니다." -ForegroundColor Green
                Write-Host ""
                $killed = $true
                continue
            }

            # 강제 종료
            Write-Host " 정상 종료 실패, 강제 종료 시도..." -ForegroundColor DarkYellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1

            $check = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if (-not $check) {
                Write-Host " 포트 $Port 서버가 강제 종료되었습니다." -ForegroundColor Green
                Write-Host ""
                $killed = $true
            } else {
                Write-Host " 포트 $Port 서버 종료 실패" -ForegroundColor Red
                Write-Host ""
            }
        } else {
            Write-Host "ℹ 포트 ${Port}: 실행 중인 서버 없음" -ForegroundColor Gray
        }
    } catch {
        Write-Host " 오류: $_" -ForegroundColor Red
    }
}

Write-Host ""
if (-not $killed) {
    Write-Host " 종료할 서버가 없습니다." -ForegroundColor Green
}
