param(
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$WorkRoot = Join-Path $ProjectRoot "work"
if (-not $OutputPath) {
    $OutputPath = Join-Path $ProjectRoot "outputs\workbuddy-episode-01-engineering-package.zip"
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$Stage = Join-Path $WorkRoot ("package-stage-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

function Copy-ProjectItem([string]$RelativePath) {
    $Source = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $Source)) { throw "Package source missing: $RelativePath" }
    $Destination = Join-Path $Stage $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

foreach ($item in @(
    "content",
    "src",
    "scripts",
    "tests",
    "assets",
    "audio",
    "hyperframes",
    "knowledge-base",
    "docs",
    "README.md",
    "DESIGN.md",
    "LICENSE",
    "package.json"
)) {
    Copy-ProjectItem $item
}

$BuilderSource = Join-Path $ProjectRoot "work\presentations\workbuddy-episode-01\tmp\build-slides.mjs"
$BuilderDestination = Join-Path $Stage "slide-builder\build-slides.mjs"
New-Item -ItemType Directory -Force -Path (Split-Path $BuilderDestination -Parent) | Out-Null
Copy-Item -LiteralPath $BuilderSource -Destination $BuilderDestination -Force

$Deliverables = Join-Path $Stage "deliverables"
New-Item -ItemType Directory -Force -Path $Deliverables | Out-Null
foreach ($name in @(
    "workbuddy-episode-01.mp4",
    "workbuddy-episode-01-courseware.pptx",
    "workbuddy-episode-01-poster.png"
)) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot "outputs\$name") -Destination (Join-Path $Deliverables $name) -Force
}

$manifest = [ordered]@{
    project = "workbuddy-video-series-template"
    episode = "workbuddy-episode-01"
    video = "1920x1080, 30fps, H.264 + AAC"
    voice = "female_question_reference_999"
    referenceSimilarityMinimum = 0.60
    adjacentSimilarityMinimum = 0.86
    includesRealWorkBuddyRecording = $true
    replaceForNextEpisode = @("content/episode.json", "assets/source screenshots", "assets/source demo video")
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Stage "engineering-manifest.json") -Encoding UTF8

New-Item -ItemType Directory -Force -Path (Split-Path $OutputPath -Parent) | Out-Null
Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $OutputPath -CompressionLevel Optimal -Force

$resolvedStage = [System.IO.Path]::GetFullPath($Stage)
$resolvedWork = [System.IO.Path]::GetFullPath($WorkRoot) + [System.IO.Path]::DirectorySeparatorChar
if (-not $resolvedStage.StartsWith($resolvedWork, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove staging directory outside work: $resolvedStage"
}
Remove-Item -LiteralPath $resolvedStage -Recurse -Force
Write-Output $OutputPath
