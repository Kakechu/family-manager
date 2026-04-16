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
| FR1 | User can add family members | FM-001, FM-002, FM-003 | API integration test, desktop/manual checks, and mobile/manual checks | Parent can create a family member and see it in the family member list on desktop and mobile | Blocker |
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
| NFR2 | The web application should work on desktop and mobile browsers | RWD-001, RWD-002, FM-002, FM-003, UX-001, UX-002, UX-004, UX-005 | Responsive UI smoke tests and manual browser checks | Core flows render and operate on desktop and mobile viewports for family members and notifications | Blocker |
| NFR3 | User authentication is required to access personal data | AUTH-001 | API integration test and authorization regression test | Anonymous requests are rejected and authenticated requests are family-scoped | Blocker |
| NFR4 | User passwords must be securely stored hashed | AUTH-002 | Auth integration test and persistence assertion | User records store password hashes only and login verifies against the hash | Blocker |
| NFR5 | The application should store data in a persistent PostgreSQL database | PERSIST-001 | Persistence and restart test | Data survives application restart and remains queryable from PostgreSQL | Blocker |
| NFR6 | The user interface should be clear and easy to use | UX-003, UX-006, plus FM-002, FM-003, EVT-001, TASK-001, UX-001, UX-002, UX-004, UX-005 | UX review, accessibility check, and smoke tests | Forms, loading states, errors, read-state updates, and confirmations are understandable on mobile and desktop | Blocker for core flows |
| NFR7 | The application should be implemented using TypeScript | CI-001 | Lint, typecheck, and build pipeline | TypeScript and static checks pass in CI for the changed scope | Blocker |

## Scenario coverage notes

- [acceptance-recurrence-and-reminders.md](acceptance-recurrence-and-reminders.md) remains the detailed scenario appendix for FR6, FR7, FR10, and FR11.
- FR1 now includes focused manual scenarios for desktop and mobile family-member add flow (FM-002, FM-003).
- FR2 through FR5, FR8, and FR9 still need detailed scenario write-ups if the team wants more than matrix-level coverage.
- NFR1, NFR3, NFR4, NFR5, and NFR7 should be validated in code review plus automated or repeatable checks rather than only manual walkthroughs.

## Manual acceptance and exploratory scenarios (Issue 79)

The following scenario set adds release-focused manual and exploratory coverage for family-member add and notifications list UX.

| Scenario ID | Area | Platforms | Requirement IDs | Check type | Release evidence expectation |
| --- | --- | --- | --- | --- | --- |
| FM-002 | Add family member - desktop flow | Desktop browser | FR1, NFR2, NFR6 | Manual acceptance | Screen recording that shows add form open, successful submit, and new family member visible in list; screenshot of validation error state for one invalid submit |
| FM-003 | Add family member - mobile flow | Mobile viewport/device | FR1, NFR2, NFR6 | Manual acceptance + exploratory | Screen recording that shows add flow from mobile navigation, successful submit, and return to list with persisted member after refresh |
| UX-004 | Notifications list access + read-state updates - desktop | Desktop browser | FR10, FR11, NFR2, NFR6 | Manual acceptance | Screen recording showing unread badge count before/after opening detail (auto-read) and manual mark as read; screenshot of read/unread visual difference |
| UX-005 | Notifications list access + read-state updates - mobile | Mobile viewport/device | FR10, FR11, NFR2, NFR6 | Manual acceptance + exploratory | Screen recording showing mobile notifications screen open, swipe/tap read-state action, clear action, and updated badge count |
| UX-006 | Keyboard and screen-reader semantics for add family member + notifications | Desktop browser with keyboard + screen reader | FR1, FR10, FR11, NFR6 | Accessibility-focused exploratory | Keyboard-only walkthrough recording plus screen-reader transcript or notes confirming accessible names, focus order, and read/unread announcement semantics |

### Scenario details

#### FM-002 - Add family member desktop flow

- Preconditions:
  - Parent user is authenticated and is inside a family context.
  - Family members page and add action are available.
- Steps:
  - Open the family members page from desktop navigation.
  - Open add family member form/modal.
  - Submit invalid payload once (for example missing name) to verify validation messaging.
  - Submit valid payload (name, role/relationship fields as applicable).
  - Reload or revisit page to verify persistence.
- Expected results:
  - Validation errors are clear and mapped to fields.
  - Successful submit gives immediate confirmation and the new member is visible in the list.
  - Refresh keeps the member visible.

#### FM-003 - Add family member mobile flow

- Preconditions:
  - Same as FM-002, but in a mobile viewport.
- Steps:
  - Open family members flow from mobile navigation.
  - Create a new family member with valid data.
  - Verify list rendering, scrolling behavior, and tap target usability.
  - Rotate viewport or navigate away/back to check state resilience.
- Expected results:
  - Add flow is usable without horizontal scrolling.
  - New member appears in list with readable row content and touch-friendly controls.
  - Navigation back/forward preserves expected state and does not duplicate entries.

#### UX-004 - Notifications desktop read-state updates

- Preconditions:
  - At least one unread task reminder and one unread event reminder exist.
- Steps:
  - Open notifications from the global icon.
  - Open one notification target and return to list.
  - Manually mark a different item as read.
  - Clear one item.
- Expected results:
  - Opening target marks item read if auto-read is enabled by product policy.
  - Manual read-state update is reflected immediately in row styling and unread badge count.
  - Clear action removes the item or moves it per design without breaking list focus.

#### UX-005 - Notifications mobile read-state updates

- Preconditions:
  - Multiple unread notifications exist on mobile.
- Steps:
  - Open notification screen.
  - Use swipe/tap action to mark one item as read.
  - Clear another item and use undo if available.
  - Return to previous screen and re-open notifications.
- Expected results:
  - Read-state transitions persist after leaving and re-entering the list.
  - Badge count updates correctly after read/clear and undo actions.
  - Touch interactions remain predictable for mixed event and task reminders.

#### UX-006 - Accessibility keyboard + screen reader semantics

- Preconditions:
  - Desktop browser with screen reader enabled.
- Steps:
  - Navigate to add family member flow with keyboard only.
  - Complete and submit form with keyboard only.
  - Open notifications with keyboard only and move through list items/actions.
  - Trigger read-state changes and clear action.
- Expected results:
  - Visible focus indicator is present on all actionable controls.
  - Form fields and notification actions have clear accessible names.
  - Notifications convey type and read/unread state in screen-reader output.
  - Focus is restored logically when leaving notification details or closing panels.

## Blocking gaps and follow-up prerequisites

- Blocker: If mobile family-member add entry point is not implemented in navigation, FM-003 cannot pass and FR1 plus NFR2 remain release-blocked.
- Blocker: If notifications endpoint does not expose stable read-state (for example isRead plus updatedAt/readAt semantics), UX-004 and UX-005 cannot produce releasable evidence for FR10 and FR11 UX behavior.
- Follow-up: Add lightweight QA evidence template (scenario ID, date, tester, artifact links, pass/fail) to keep manual evidence auditable across releases.

## Release blockers

- Any missing or failing coverage for FR1-FR11 is release-blocking because those are the MVP functional requirements.
- Any missing or failing coverage for NFR3, NFR4, NFR5, or NFR7 is release-blocking because they affect access control, credential safety, persistence, and build quality.
- NFR2 and NFR6 are release-blocking when the core flows are not usable on desktop or mobile, or when the UI is confusing enough to prevent basic task completion.
- Remaining gaps that are explicitly marked as follow-up work, future enhancements, or non-MVP polish are not blockers if the release criteria above are met.
