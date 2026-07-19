$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  node scripts/build-audio.mjs @args
}
finally {
  Pop-Location
}
