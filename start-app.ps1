$root = $PSScriptRoot
$url = 'http://localhost:3000'

$running = $false
try {
  Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing | Out-Null
  $running = $true
} catch {}

if (-not $running) {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Host 'ERROR: Node.js 未安装或不在 PATH 中，请先安装 Node.js' -ForegroundColor Red
    exit 1
  }
  Write-Host 'Starting local service, please wait...'
  # Hidden 窗口会吞掉验证码等控制台输出：把 stdout/stderr 重定向到日志文件，
  # 注册验证码同时落在 server/logs/dev-codes.txt（未配 SMTP 时）
  $outLog = Join-Path $root 'server\logs\server.out.log'
  $errLog = Join-Path $root 'server\logs\server.err.log'
  New-Item -ItemType Directory -Force -Path (Split-Path $outLog) | Out-Null
  Start-Process -FilePath $node.Source -ArgumentList 'server\server.js' -WorkingDirectory $root `
    -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $started = $false
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Milliseconds 700
    try {
      Invoke-WebRequest -Uri $url -TimeoutSec 1 -UseBasicParsing | Out-Null
      $started = $true
      break
    } catch {}
  }
  if (-not $started) {
    Write-Host 'ERROR: 服务未能启动。' -ForegroundColor Red
    if (Test-Path $errLog) { Get-Content $errLog -Tail 15 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow } }
    Write-Host '可能原因：端口 3000 被占用（上一条 node 进程僵死）、Node.js 版本过低'
    exit 1
  }
}

Start-Process $url