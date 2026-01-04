# Run DeskZen via Docker Compose (Windows-friendly)
# Usage examples:
#   .\run-docker.ps1                 # build + up (detached)
#   .\run-docker.ps1 -Logs           # follow logs after starting
#   .\run-docker.ps1 -Down           # stop containers
#   .\run-docker.ps1 -BackendOnly    # use backend-only compose file
#   .\run-docker.ps1 -NoBuild        # skip image build

[CmdletBinding()]
param(
  [switch]$Down,
  [switch]$Logs,
  [switch]$BackendOnly,
  [string]$ComposeFile,
  [switch]$NoBuild,
  [switch]$NoDetach
)

$ErrorActionPreference = 'Stop'

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name. Install Docker Desktop and ensure 'docker' is on PATH."
  }
}

Assert-Command 'docker'

# Ensure Docker daemon is running
try {
  docker info | Out-Null
} catch {
  throw "Docker does not appear to be running. Start Docker Desktop and try again."
}

# Ensure compose plugin is available
try {
  docker compose version | Out-Null
} catch {
  throw "'docker compose' is not available. Update Docker Desktop (Compose v2) and try again."
}

$repoRoot = $PSScriptRoot
Set-Location -Path $repoRoot

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  if ($BackendOnly) {
    $ComposeFile = Join-Path $repoRoot 'backend\docker-compose.backend.yml'
  } else {
    $ComposeFile = Join-Path $repoRoot 'docker-compose.yaml'
  }
}

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

$detachArg = if ($NoDetach) { '' } else { '-d' }
$buildArg = if ($NoBuild) { '' } else { '--build' }

Write-Host "Using compose file: $ComposeFile"

if ($Down) {
  Write-Host "Stopping containers..."
  docker compose -f "$ComposeFile" down
  exit 0
}

Write-Host "Starting containers..."
docker compose -f "$ComposeFile" up $detachArg $buildArg --remove-orphans

Write-Host ""
Write-Host "Container status:"
docker compose -f "$ComposeFile" ps


if ($Logs) {
  Write-Host ""
  Write-Host "Following logs (Ctrl+C to stop tailing)..."
  docker compose -f "$ComposeFile" logs -f --tail=200
}
