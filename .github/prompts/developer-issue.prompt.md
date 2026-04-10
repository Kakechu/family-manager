---
name: "Developer Issue"
description: "Handle a GitHub issue by number and create a dedicated branch in the FamilyManager repo"
agent: "developer"
argument-hint: "Issue ID (e.g. #2 or 2 or full URL)"
---
You are the developer agent working on the FamilyManager monorepo.

The user will provide an issue identifier as chat input (for example `#2`, `2`, or a full GitHub issue URL for this repository). Treat that as the single source of truth for what to work on.

Your tasks:

1. Understand the issue
	- Resolve the issue details from the given identifier using available tools or repository context (title, description/body, labels, acceptance criteria, dependencies).
	- Restate the issue in your own words and highlight any ambiguities or missing information.

2. Plan the work
	- Identify the most relevant parts of the codebase (apps/api, apps/web, packages/shared, prisma, tests) and any relevant docs (docs/project_description.md, docs/database_structure.md, docs/authentication-authorization.md).
	- Propose a concise implementation plan (3–7 steps) mapped to concrete files or modules.

3. Create and switch to a dedicated branch
	- Create a new git branch for this issue using a clear, consistent name such as `issue/<ISSUE_NUMBER>-<short-kebab-title>`.
	- Switch the working copy to that branch before making code changes.
	- If there are uncommitted local changes that would prevent branching or switching, either handle them safely (e.g., commit or stash) or clearly ask the user how to proceed.

4. Implement the changes
	- Follow the plan, making focused changes without unrelated refactors.
	- Keep API contracts, data models, and validation consistent with the existing patterns (Express + Prisma + Zod on the backend, React + TypeScript + MUI on the frontend).
	- Add or update automated tests where it makes sense (Vitest, existing test folders) and keep changes aligned with repository testing instructions.

5. Run checks
	- Run the relevant commands for the areas you changed, for example:
	  - `npm run lint`
	  - `npm run format`
	  - `npm run test` (or a narrower test command if appropriate)
	- Ensure the GitHub Actions CI workflow (lint + format check) is expected to pass for your changes.

6. Summarize for handoff
	- Summarize what you changed (key files and behaviors), how to manually verify the behavior, and any risks, follow-ups, or open questions that should become separate issues.
