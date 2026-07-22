# Build static site for Tencent EdgeOne Pages (base path /).
$ErrorActionPreference = 'Stop'
$web = Join-Path (Split-Path -Parent $PSScriptRoot) 'web'
Push-Location $web
try {
  $env:VITE_BASE_PATH = '/'
  $env:VITE_USE_ALL_ELEMENT_PLUS_STYLE = 'true'
  npm run build:pro
  New-Item -ItemType File -Force -Path (Join-Path $web 'dist\.spa') | Out-Null
  Write-Host "OK: $(Join-Path $web 'dist')"
} finally {
  Pop-Location
}
