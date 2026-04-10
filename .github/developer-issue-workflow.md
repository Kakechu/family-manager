# Developer Issue Workflow

Use this prompt template to quickly start working on a specific issue with the developer agent in this repo.

## Usage
Copy this template into Copilot Chat, then replace the angle‑bracket sections with the details of the issue you are about to work on.

```text
Act as the developer agent for the FamilyManager monorepo.

Issue
- Title: <ISSUE_TITLE>
- Link/ID: <ISSUE_URL or #NUMBER>
- Short summary: <1–3 sentences in my own words>

Goal / Definition of Done
- <Clear description of what “done” means for this issue>

Key Requirements from the Issue
- <bullet requirement 1>
- <bullet requirement 2>
- <...>

Non‑Goals / Out of Scope
- <anything explicitly NOT to change>

Repo Context
- Likely areas of code: <e.g. apps/web/src/features/events, apps/api/src/modules/events>
- Relevant docs: docs/project_description.md, docs/database_structure.md, docs/authentication-authorization.md
- Related existing features or examples: <links/paths if you know them>

Constraints & Preferences
- Keep changes focused on this issue; avoid unrelated refactors.
- Preserve existing API contracts and data model unless absolutely necessary.
- Validate external input with Zod and follow existing patterns.
- Add or update tests where it makes sense.
- Plan to run `npm run lint` and `npm run format` before finishing.

What I want you to do
1. Rephrase the issue in your own words and call out any ambiguities.
2. Propose a short implementation plan (3–7 steps) tied to concrete files/modules.
3. Execute the plan step by step, updating code and tests.
4. Summarize the changes (files touched, behavior changes, test impact) and how to manually verify them.
```
