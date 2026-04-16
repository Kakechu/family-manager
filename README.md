# FamilyManager

FamilyManager is a shared family management web application for organizing everyday family life in one place. It brings together a family calendar, chores and tasks, assignments, comments, and reminders so parents and family members can coordinate schedules and responsibilities without switching between separate tools.

## What The Project Covers

The application is designed around the core family workflow described in the project docs:

- family member management
- calendar events and event categories
- event assignments and filtering by family member
- tasks and recurring chores
- task completion tracking and comments
- reminders and notifications for upcoming work and events
- authenticated access to family data

The implementation uses TypeScript throughout, with a React + Vite frontend, an Express + Prisma backend, PostgreSQL for persistence, Zod for validation, Vitest for tests, and Biome for formatting and linting.

## Main Structure

This repository is organized as a monorepo with three main application packages and supporting documentation and database files.

- `apps/api` - Express backend API with authentication, family, event, task, assignment, comment, and notification modules.
- `apps/web` - React frontend built with Vite and Material UI.
- `packages/shared` - Shared contracts, schemas, types, utilities, and constants used by both the frontend and backend.
- `prisma/` - Prisma schema, migrations, and seed data for the PostgreSQL data model.
- `docs/` - Product, architecture, UX, traceability, and review documents that define the intended behavior.
- `tests/` - Shared API, integration, unit, and end-to-end test assets.
- `rest/api.http` - HTTP request collection for manual API testing.

## How It Was Developed

The project was developed in an issue-driven workflow rather than as a single large implementation. Work was split into focused GitHub issues, each with a clear scope, acceptance criteria, and requirement links back to the product documentation. That made it possible to trace each change back to a documented requirement and keep the work incremental.

Different AI agents were used for different parts of the work:

- `architect` for module boundaries, API contracts, and data-model decisions
- `ui-ux-designer` for responsive flows and interaction design
- `developer` for feature implementation across backend and frontend
- `testing-engineer` for test coverage and regression planning
- `security-reviewer` for auth, authorization, and data exposure review
- `qa` for acceptance criteria and traceability
- `reviewer` for final defect-focused review

That workflow kept the implementation organized around clear ownership: planning and design were defined first, implementation followed in smaller issue-sized steps, and testing/review were handled as separate passes instead of being deferred until the end.

## Key Scripts

From the repository root:

- `npm run dev:api` - start the backend in development mode
- `npm run dev:web` - start the frontend in development mode
- `npm run build` - build all workspace packages
- `npm run test` - run tests across all workspaces
- `npm run lint` - lint all workspaces
- `npm run format` - format all workspaces
- `npm run format:check` - verify formatting without writing changes
- `npm run db:reset` - reset the Prisma database schema and seed data

## Documentation

The repo includes supporting documents for the product and implementation plan:

- `docs/project_description.md` - product goals, functional requirements, and non-functional requirements
- `docs/database_structure.md` - domain model and persistence structure
- `docs/backend-architecture-and-api-contracts.md` - backend design and API conventions
- `docs/ux-calendar-and-tasks.md` - calendar and task UX guidance
- `docs/ux-notifications-and-reminders.md` - notification and reminder UX guidance
- `docs/requirement-traceability-and-acceptance-matrix.md` - requirement-to-test traceability

## Current Focus

The repository is structured to support family-scoped data, secure authentication, modular backend code, and a responsive UI that works on both desktop and mobile browsers. The remaining implementation work should continue to follow the issue-based process so requirements, code, and validation stay aligned.