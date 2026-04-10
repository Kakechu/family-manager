param(
    [Parameter(Mandatory = $true)]
    [string]$PlanFile,

    [Parameter(Mandatory = $true)]
    [string]$Repo,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

Assert-Command -Name "gh"

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run 'gh auth login' and try again."
}

if (-not (Test-Path -Path $PlanFile)) {
    throw "Plan file not found: $PlanFile"
}

$planRaw = Get-Content -Path $PlanFile -Raw
$plan = $planRaw | ConvertFrom-Json

if (-not $plan.issues -or $plan.issues.Count -eq 0) {
    throw "Plan file must contain a non-empty 'issues' array."
}

$created = @()

foreach ($issue in $plan.issues) {
    if (-not $issue.title -or -not $issue.body -or -not $issue.agent) {
        throw "Each issue must include 'title', 'body', and 'agent'."
    }

    $labels = @()
    if ($issue.labels) {
        $labels += $issue.labels
    }

    # Add role label so issues are easy to route in boards and filters.
    $labels += "agent:$($issue.agent)"

    $tmpBodyFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmpBodyFile -Value $issue.body -NoNewline

    $args = @("issue", "create", "--repo", $Repo, "--title", $issue.title, "--body-file", $tmpBodyFile)
    if ($labels.Count -gt 0) {
        $args += @("--label", ($labels -join ","))
    }

    if ($DryRun) {
        $url = "DRY-RUN"
    }
    else {
        $url = & gh @args
    }

    Remove-Item -Path $tmpBodyFile -Force

    $created += [pscustomobject]@{
        title = $issue.title
        agent = $issue.agent
        url = ($url | Out-String).Trim()
    }
}

$created | Format-Table -AutoSize
