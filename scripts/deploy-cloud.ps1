<#
Cloud function deploy script (minimal, PowerShell 5 compatible)
Prerequisite: npm install -g @cloudbase/cli
Usage:
  powershell -ExecutionPolicy Bypass -File ./scripts/deploy-cloud.ps1 -EnvId your-env -Functions login,events-batch
Params:
  -EnvId        CloudBase environment id
  -Functions    Comma separated function names (default: login)
  -SkipBuild    Skip build step
  -NoLogin      Skip tcb login (reuse existing session)
#>
param(
  [string]$EnvId = $env:TCB_ENV_ID,
  [string]$Functions = "login",
  [switch]$SkipBuild,
  [switch]$NoLogin
)

if(-not $EnvId){ Write-Error "EnvId required"; exit 1 }

# Parse functions
$funcArr = @()
foreach($n in $Functions.Split(',')){
  $t = $n.Trim()
  if($t.Length -gt 0){ $funcArr += $t }
}
if($funcArr.Count -eq 0){ Write-Error "No functions parsed"; exit 1 }

Write-Host "Env: $EnvId" -ForegroundColor Cyan

if(-not $NoLogin){
  Write-Host "Login (ignore errors if already logged in)" -ForegroundColor Yellow
  try { tcb login | Out-Null } catch { Write-Warning "login skipped" }
}

Write-Host "Use env..." -ForegroundColor Yellow
tcb env:use $EnvId | Out-Null

foreach($f in $funcArr){
  $path = Join-Path (Get-Location) ("cloudfunctions/" + $f)
  if(-not (Test-Path $path)){ Write-Warning "Skip $f (dir missing)"; continue }
  $buildFlag = ""
  if($SkipBuild){ $buildFlag = "--skip-build" }
  Write-Host ("Deploy: " + $f) -ForegroundColor Green
  $cmd = @("functions:deploy", $f, $buildFlag, "--path", $path, "--force") | Where-Object { $_ -ne "" }
  # Show command
  Write-Host ("tcb " + ($cmd -join ' ')) -ForegroundColor DarkGray
  tcb @cmd
  if($LASTEXITCODE -ne 0){ Write-Error ("Failed: " + $f); exit 1 }
}

Write-Host "Done" -ForegroundColor Green

