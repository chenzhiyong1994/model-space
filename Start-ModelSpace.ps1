param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$address = 'http://127.0.0.1:5188/'
$runtimeDir = Join-Path $projectRoot '.local'
try {
  $existing = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
  if ($existing.Content -notmatch 'Model Space') { throw 'Port 5188 is occupied by another application.' }
  Write-Host "Model Space is ready: $address"
  if (-not $NoBrowser) { Start-Process $address }
  exit 0
} catch {
  if ($_.Exception.Message -like '*occupied*') { throw }
}
$node = (Get-Command node -ErrorAction Stop).Source
$nodeVersion = & $node --version
if ([version]$nodeVersion.TrimStart('v') -lt [version]'22.12.0') { throw 'Node.js 22.12 or newer is required.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\vite\bin\vite.js'))) {
  Push-Location $projectRoot
  try { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } } finally { Pop-Location }
}
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$vite = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$process = Start-Process -FilePath $node -ArgumentList @("`"$vite`"", '--host', '127.0.0.1', '--port', '5188', '--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
@{ pid = $process.Id; startedAt = $process.StartTime.ToUniversalTime().ToString('o'); script = $vite } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'server.json') -Encoding UTF8
$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  if ($process.HasExited) { throw 'Server stopped. See .local/server-error.log.' }
  try { $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 1; if ($response.Content -match 'Model Space') { $ready = $true; break } } catch {}
  Start-Sleep -Milliseconds 250
}
if (-not $ready) { throw 'Server did not become ready. See .local/server.log.' }
Write-Host "Model Space is ready: $address"
if (-not $NoBrowser) { Start-Process $address }
