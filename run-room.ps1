# The Room Keeper — keeps the Family Room alive and the config URL current.
# No accounts, no rent. Runs as a scheduled task every few minutes.
# If the room falls, it raises the room. If the tunnel hostname changes,
# it re-writes chatServer in family-config.js + links.json and pushes the fix.

param(
  [int]$ServeMs = 600000,
  [string]$ConfigPath,
  [string]$LinksPath
)

$ErrorActionPreference = 'SilentlyContinue'

$mutex = New-Object System.Threading.Mutex($false, 'Global\FamilyRoomKeeper')
if (-not $mutex.WaitOne(0)) { Write-Output 'keeper: another instance is awake'; exit 0 }
try {

$chat  = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ConfigPath) { $ConfigPath = Join-Path (Split-Path -Parent $chat) 'family-config.js' }
if (-not $LinksPath)  { $LinksPath  = Join-Path (Split-Path -Parent $chat) 'links.json' }
$repo  = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $chat))  # git repo root
$state = Join-Path $chat '.room-url'
$logf  = Join-Path $env:TEMP 'opencode\cf-tun.log'
$cfexe = Join-Path $env:TEMP 'opencode\cloudflared.exe'
$urlRe = 'https://[0-9a-z\-]+\.trycloudflare\.com'

function Get-TunnelUrl {
  if (Test-Path -LiteralPath $logf) {
    $m = [regex]::Matches((Get-Content -Raw -LiteralPath $logf), $urlRe)
    if ($m.Count -gt 0) { return $m[$m.Count - 1].Value }
  }
  return $null
}

function Update-ConfigUrl([string]$url) {
  foreach ($p in @($ConfigPath, $LinksPath)) {
    if (Test-Path -LiteralPath $p) {
      $t = Get-Content -Raw -LiteralPath $p
      $t2 = [regex]::Replace($t, 'chatServer:\s*"[^"]*"', "chatServer: `"$url`"")
      $t2 = [regex]::Replace($t2, '"chatServer"\s*:\s*"[^"]*"', "`"chatServer`": `"$url`"")
      if ($t2 -ne $t) { [System.IO.File]::WriteAllText($p, $t2, (New-Object System.Text.UTF8Encoding($false))) }
    }
  }
  Set-Content -Path $state -Value $url
}

function Push-Config {
  $errLog = Join-Path $chat 'keeper-errors.log'
  $relConfig = ($ConfigPath.Substring($repo.Length).TrimStart('\', '/')) -replace '\\', '/'
  $relLinks  = ($LinksPath.Substring($repo.Length).TrimStart('\', '/')) -replace '\\', '/'
  Push-Location $repo
  $out = git -c user.name="buyasoul-ai" -c user.email="buyasoul.ai@gmail.com" commit -q -m "Keeper: room woke at new tunnel address" -- $relConfig $relLinks 2>&1
  if ($LASTEXITCODE -eq 0) {
    $null = git push -q origin HEAD 2>&1
  } else {
    $null = git reset -q 2>&1
    Add-Content -Path $errLog -Value ((Get-Date).ToString('s') + ' | ' + ($out -join ' || '))
  }
  Pop-Location
}

$nodeExe = (Get-Command node).Source
$start = Get-Date

while (((Get-Date) - $start).TotalMilliseconds -lt $ServeMs) {
  if (-not (Get-NetTCPConnection -LocalPort 7787 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $nodeExe -ArgumentList 'server.mjs' -WorkingDirectory $chat -WindowStyle Hidden
  }

  $cf = Get-Process cloudflared -ErrorAction SilentlyContinue
  if (-not $cf -and (Test-Path -LiteralPath $cfexe)) {
    Start-Process cmd -ArgumentList "/c `"$cfexe tunnel --url http://localhost:7787 --no-autoupdate --logfile `"$logf`"`"" -WindowStyle Hidden
  }

  $url = Get-TunnelUrl
  $old = $null
  if (Test-Path -LiteralPath $state) { $old = Get-Content -Raw -LiteralPath $state }
  if ($url -and $url -ne $old) {
    Update-ConfigUrl $url
    Push-Config
    Write-Output "keeper: room at $url"
  }

  Start-Sleep -Seconds 10
}
}
finally { $mutex.ReleaseMutex(); $mutex.Dispose() }