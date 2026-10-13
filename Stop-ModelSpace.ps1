$ErrorActionPreference = 'Stop'
$recordPath = Join-Path $PSScriptRoot '.local\server.json'
if (-not (Test-Path -LiteralPath $recordPath)) { Write-Host 'No launcher-managed server found.'; exit 0 }
$record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$server = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if (-not $server) { Write-Host 'Server is already stopped.'; exit 0 }
$details = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)"
$expectedScript = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
if ($record.script -ne $expectedScript -or $server.ProcessName -ne 'node' -or $server.StartTime.ToUniversalTime().ToString('o') -ne $record.startedAt -or $details.CommandLine -notlike "*$expectedScript*") {
  throw 'Process identity changed. Refusing to stop an unrelated process.'
}
Stop-Process -Id $record.pid
Remove-Item -LiteralPath $recordPath
Write-Host 'Model Space server stopped. Your saved data is preserved.'
