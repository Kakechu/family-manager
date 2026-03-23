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

## Agent Role Selection Guidance
Use these custom agents based on task intent:
- architect: system design, API contracts, schema boundaries, trade-offs
- developer: feature implementation and refactoring
- qa: acceptance criteria, manual test planning, traceability
- reviewer: defect-focused review and risk analysis
- testing-engineer: automated test implementation and CI testing strategy

## Delivery Expectations
- State assumptions clearly when requirements are ambiguous.
- Include test impact in every code change summary.
- Prioritize correctness, security, and maintainability over novelty.
