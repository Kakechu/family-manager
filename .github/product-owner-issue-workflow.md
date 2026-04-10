# Product Owner Issue Workflow

Use this workflow to create role-specific GitHub issues in bulk from a single plan file.

## Prerequisites
- GitHub CLI installed (`gh --version`)
- Authenticated session (`gh auth login`)
- Repo write access

## Plan File Format
Create a JSON file (for example `issue-plan.json`) with this structure:

```json
{
  "issues": [
    {
      "agent": "architect",
      "title": "Define event and task API contracts",
      "labels": ["planning", "backend"],
      "body": "## Summary\nDefine stable DTOs and validation boundaries.\n\n## Acceptance Criteria\n- [ ] Contracts documented\n- [ ] Validation approach defined\n"
    },
    {
      "agent": "developer",
      "title": "Implement event assignment endpoint",
      "labels": ["feature", "backend"],
      "body": "## Summary\nImplement endpoint and route wiring.\n\n## Definition of Done\n- [ ] Tests updated\n- [ ] Lint/type-check/tests passed\n"
    }
  ]
}
```

## Run Bulk Creation
From repository root:

```powershell
./scripts/create-agent-issues.ps1 -PlanFile ./issue-plan.json -Repo owner/repo
```

Preview without creating issues:

```powershell
./scripts/create-agent-issues.ps1 -PlanFile ./issue-plan.json -Repo owner/repo -DryRun
```

## Notes
- The script adds an `agent:<name>` label automatically.
- Keep issue scope small and role-specific for predictable handoffs.
- If automation is unavailable, use `.github/ISSUE_TEMPLATE/agent-work-item.md` manually.
