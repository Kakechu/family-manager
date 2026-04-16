# Requirement Traceability and Acceptance Test Matrix

## Purpose

This document maps the MVP requirements in [project_description.md](project_description.md) to scenario IDs, verification evidence, and release-readiness expectations.

It is the master planning artifact for requirement coverage. Detailed recurrence, reminder, timezone, overlap, and notification UX scenarios live in [acceptance-recurrence-and-reminders.md](acceptance-recurrence-and-reminders.md).

## Scope and assumptions

- [project_description.md](project_description.md) remains the source of truth for the functional and non-functional requirements.
- Scenario IDs in this matrix are stable planning identifiers. Some already exist in the detailed recurrence/reminder appendix; others are proposed identifiers for missing MVP coverage.
- Reminder timing assumptions are taken from the existing design docs and may be refined later if product policy changes.
- NFR7 is treated as a CI and build-quality gate rather than a manual acceptance scenario.

## Functional requirement matrix

| Requirement | Requirement summary | Scenario IDs | Primary verification | Pass evidence | Release stance |
| --- | --- | --- | --- | --- | --- |
| FR1 | User can add family members | FM-001 | API integration test and UI smoke test | Parent can create a family member and see it in the family member list | Blocker |
| FR2 | User can create calendar events | EVT-001 | API integration test and UI smoke test | Event is created, persisted, and visible in the calendar or list view | Blocker |
| FR3 | User can categorize events | EVT-002 | API integration test and UI smoke test | Event category is selected, persisted, and rendered with the correct label/color | Blocker |
| FR4 | User can assign events to family members | EVT-003 | API integration test and UI smoke test | One or more family members can be assigned and appear in event detail/list context | Blocker |
| FR5 | User can filter events by family member | EVT-004 | API integration test and UI smoke test | Event list updates to show only matching family-member assignments and can be cleared | Blocker |
| FR6 | User can create chores/tasks | TASK-001 | API integration test and UI smoke test | Non-recurring task is created with required fields and persisted | Blocker |
| FR7 | User can create recurring chores/tasks | REC-001, REC-002, REC-003, REC-004 | Detailed acceptance scenarios and recurrence service tests | NONE, DAILY, WEEKLY, and MONTHLY recurrence behavior is covered | Blocker |
| FR8 | User can mark chores as completed | TASK-002 | API integration test and UI smoke test | Task completion persists and the completed state is reflected in the UI | Blocker |
| FR9 | Users can comment on tasks | COMMENT-001 | API integration test and UI smoke test | Task comment is created, listed, and scoped to the current family | Blocker |
| FR10 | Users receive reminders for upcoming events | REM-004, REM-005, REM-006, TZ-001, TZ-003, OV-001 | Detailed acceptance scenarios and reminder scheduler tests | Event reminder is generated in the expected window and remains timezone-safe | Blocker |
| FR11 | Users receive reminders for tasks | REM-001, REM-002, REM-003, REC-002, REC-003, REC-004, TZ-002, TZ-003, OV-001 | Detailed acceptance scenarios and reminder scheduler tests | Task reminder is generated in the expected window and recurrence does not duplicate reminders | Blocker |

## Non-functional requirement matrix

| Requirement | Requirement summary | Scenario IDs | Primary verification | Pass evidence | Release stance |
| --- | --- | --- | --- | --- | --- |
| NFR1 | The backend should use a modular architecture | ARCH-001 | Architecture review and module boundary checklist | Auth, family members, events, tasks, comments, and notifications live in distinct feature modules | Blocker |
| NFR2 | The web application should work on desktop and mobile browsers | RWD-001, RWD-002, UX-001, UX-002 | Responsive UI smoke tests and manual browser checks | Core flows render and operate on desktop and mobile viewports | Blocker |
| NFR3 | User authentication is required to access personal data | AUTH-001 | API integration test and authorization regression test | Anonymous requests are rejected and authenticated requests are family-scoped | Blocker |
| NFR4 | User passwords must be securely stored hashed | AUTH-002 | Auth integration test and persistence assertion | User records store password hashes only and login verifies against the hash | Blocker |
| NFR5 | The application should store data in a persistent PostgreSQL database | PERSIST-001 | Persistence and restart test | Data survives application restart and remains queryable from PostgreSQL | Blocker |
| NFR6 | The user interface should be clear and easy to use | UX-003, plus EVT-001, TASK-001, UX-001, UX-002 | UX review, accessibility check, and smoke tests | Forms, loading states, errors, and confirmations are understandable on mobile and desktop | Blocker for core flows |
| NFR7 | The application should be implemented using TypeScript | CI-001 | Lint, typecheck, and build pipeline | TypeScript and static checks pass in CI for the changed scope | Blocker |

## Scenario coverage notes

- [acceptance-recurrence-and-reminders.md](acceptance-recurrence-and-reminders.md) remains the detailed scenario appendix for FR6, FR7, FR10, and FR11.
- FR1 through FR5, FR8, and FR9 need detailed scenario write-ups if the team wants more than the matrix-level coverage recorded here.
- NFR1, NFR3, NFR4, NFR5, and NFR7 should be validated in code review plus automated or repeatable checks rather than only manual walkthroughs.

## Release blockers

- Any missing or failing coverage for FR1-FR11 is release-blocking because those are the MVP functional requirements.
- Any missing or failing coverage for NFR3, NFR4, NFR5, or NFR7 is release-blocking because they affect access control, credential safety, persistence, and build quality.
- NFR2 and NFR6 are release-blocking when the core flows are not usable on desktop or mobile, or when the UI is confusing enough to prevent basic task completion.
- Remaining gaps that are explicitly marked as follow-up work, future enhancements, or non-MVP polish are not blockers if the release criteria above are met.
