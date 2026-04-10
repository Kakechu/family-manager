# FamilyManager Copilot Instructions

## Project Overview
FamilyManager is a shared family management web app for events, chores, reminders, and notifications.

## Stack and Standards
- Frontend: React, TypeScript, Vite, Material UI
- Backend: Express, TypeScript, Prisma, PostgreSQL
- Validation: Zod
- Testing: Vitest
- Formatting and linting: Biome

## Global Coding Rules
- Use TypeScript-first patterns and keep typings explicit at module boundaries.
- Prefer small, modular Express backend components.
- Keep changes focused and avoid unrelated refactors.
- Validate external input with Zod before business logic execution.
- Preserve compatibility unless a breaking change is explicitly requested.
- Consider mobile and desktop behavior for UI changes.

## Instruction Precedence
When multiple instruction sources apply, follow this order:
1. File-scoped instructions with matching applyTo patterns (most specific wins).
2. Active agent instructions (.agent.md).
3. Repository-wide Copilot instructions in this file.

If rules overlap, follow the stricter rule and state assumptions when ambiguity remains.

## Requirement Alignment
Always map work to the documented requirements in docs/project_description.md:
- family members, events, categories, assignments, filtering
- tasks, recurrence, completion, comments
- reminders and notifications
- authentication and secure password handling

## Data Model Awareness
When changing backend or persistence logic, align with docs/database_structure.md entities:
- Family, User, FamilyMember
- Event, EventCategory, EventAssignment
- Task, TaskCategory, TaskAssignment
- Comment, Notification

## API and Contract Consistency
- Keep response shapes consistent across routes for both success and error outcomes.
- Use stable field names for shared concepts (id, familyId, assigneeId, categoryId).
- For list endpoints, keep filtering and pagination conventions consistent.
- Avoid breaking response contracts unless explicitly requested.

## Date and Time Handling
- Store timestamps in UTC.
- Convert to user-local time only at display or explicit API boundary layers.
- Treat recurrence and reminder calculations as timezone-aware logic.
- Include edge cases for daylight-saving changes in design and testing notes.

## Agent Role Selection Guidance
Use these custom agents based on task intent:
- product-owner: requirement decomposition, issue planning, sequencing, and traceability
- architect: system design, API contracts, schema boundaries, trade-offs
- developer: feature implementation and refactoring
- qa: acceptance criteria, manual test planning, traceability
- reviewer: defect-focused review and risk analysis
- testing-engineer: automated test implementation and CI testing strategy
- ui-ux-designer: interaction design, responsive usability, accessibility, and flow clarity
- security-reviewer: authentication/authorization, data exposure, and abuse-risk review

## Delivery Expectations
- State assumptions clearly when requirements are ambiguous.
- Include test impact in every code change summary.
- Prioritize correctness, security, and maintainability over novelty.

## Definition of Done
- Run configured workspace commands for linting, type-checking, and tests relevant to the change.
- Ensure changed behavior is covered by new or updated automated tests when applicable.
- Confirm requirement coverage against docs/project_description.md scope.
- Summarize residual risks, known gaps, and follow-up work.
