---
applyTo: "src/**/*.{ts,tsx,js,jsx}"
description: "Guidance for implementing application source code in FamilyManager."
---

# Source Code Instructions

## Scope
Apply these instructions when editing application source code in src.

## Implementation Guidelines
- Follow module boundaries; avoid mixing route, service, and persistence concerns.
- Keep functions and components focused and predictable.
- Use clear naming for business concepts such as family member, event, task, assignment, and notification.
- Favor composition over deeply nested logic.

## API and Validation
- Validate request payloads and params with Zod.
- Return consistent error payloads and HTTP status codes.
- Avoid leaking internal database or stack details in API errors.

## Prisma and Database Safety
- Keep database operations explicit and readable.
- Protect data integrity for assignment tables and relationship updates.
- Consider family-level data isolation in all queries and mutations.

## Security and Auth
- Require authentication for personal or family-specific data.
- Never store plaintext passwords; use secure hashing.
- Enforce authorization checks, not only authentication checks.

## Frontend Quality
- Ensure UX works on mobile and desktop viewport sizes.
- Keep Material UI usage consistent and accessible.
- Handle loading, empty, and error states intentionally.

## Change Hygiene
- Prefer minimal diff size with high clarity.
- Add or update tests for behavior changes.
- Flag risks and edge cases in the summary.
