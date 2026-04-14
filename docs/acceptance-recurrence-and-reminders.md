# Recurrence and Reminder Acceptance Scenarios

## 1. Overview and Scope

This document defines acceptance and exploratory test scenarios for:

- Recurring chores/tasks using Task.recurrenceType (NONE, DAILY, WEEKLY, MONTHLY).
- Time-based reminders for tasks and events (before-due, at-due, overdue).
- Timezone and daylight-saving-time (DST) behavior for reminders and recurring due dates.
- Overlapping events/tasks and cross-day boundary behavior.

It complements the functional and non-functional requirements in project_description.md and the technical design in notification-scheduling-and-reminders.md and ux-notifications-and-reminders.md.

### 1.1 Linked Requirements

Functional:
- FR6 – User can create chores/tasks.
- FR7 – User can create recurring chores/tasks.
- FR10 – Users receive reminders for upcoming events.
- FR11 – Users receive reminders for tasks.

Non-functional:
- NFR2 – Works on desktop and mobile browsers (UX expectations for notification visibility and clarity).
- NFR3 – User authentication required to access personal data (scenarios assume authenticated context, per-user notifications).
- NFR5 – Data persisted in PostgreSQL (scenarios assume durable reminders and notification state).

### 1.2 Scenario Format and Conventions

Each scenario includes:
- **ID** – Stable identifier for mapping to automated tests later.
- **Area** – Recurrence, reminders, timezone/DST, or UX.
- **Requirements** – Referenced FR/NFR identifiers.
- **Preconditions** – Data and configuration setup.
- **Steps** – Single-user flow unless otherwise noted.
- **Expected Results** – System behavior that must hold true.
- **Risk** – `High`, `Medium`, or `Low` to highlight deeper testing needs.

Scenario IDs are grouped as follows:
- `REC-*` – Recurring task behavior.
- `REM-*` – Reminder timing for tasks and events.
- `TZ-*` – Timezone and DST edge cases.
- `OV-*` – Overlapping and cross-day behavior.
- `UX-*` – Basic visibility and usability expectations.

## 2. Scenario Catalog (Summary)

| ID        | Area        | Title                                                     | Requirements              | Risk   |
|----------|-------------|-----------------------------------------------------------|---------------------------|--------|
| REC-001  | Recurrence  | Non-recurring task with NONE recurrence                   | FR6, FR7                  | Medium |
| REC-002  | Recurrence  | Daily recurring task – next occurrence after completion   | FR7, FR11                 | High   |
| REC-003  | Recurrence  | Weekly recurring task – weekday consistency               | FR7, FR11                 | Medium |
| REC-004  | Recurrence  | Monthly recurring task – end-of-month normalization       | FR7, FR11                 | High   |
| REM-001  | Reminders   | Task reminder before due time                             | FR11                      | Medium |
| REM-002  | Reminders   | Task reminder at due time                                 | FR11                      | Medium |
| REM-003  | Reminders   | Overdue task reminder when user returns                   | FR11                      | High   |
| REM-004  | Reminders   | Event reminder before start                               | FR10                      | Medium |
| REM-005  | Reminders   | Event reminder at start time                              | FR10                      | Medium |
| REM-006  | Reminders   | Event reminder for already-started event                  | FR10                      | High   |
| TZ-001   | Timezone    | Event reminder across DST start (spring forward)          | FR10, NFR5                | High   |
| TZ-002   | Timezone    | Daily recurring task across DST end (fall back)           | FR7, FR11, NFR5           | High   |
| TZ-003   | Timezone    | Cross-day reminder when local date differs from UTC       | FR10, FR11, NFR5          | Medium |
| OV-001   | Overlap     | Multiple reminders in same 5-minute window                | FR10, FR11, NFR2          | High   |
| OV-002   | Overlap     | Overlapping event and task around midnight                | FR7, FR10, FR11           | Medium |
| UX-001   | UX          | Notification visibility and basic actions                  | FR10, FR11, NFR2          | Medium |
| UX-002   | UX          | Mobile notification list and clearing behavior            | FR10, FR11, NFR2          | Medium |

High-risk scenarios are candidates for deeper exploratory and automated testing.

---

## 3. Recurrence Scenarios (REC-*)

### REC-001 – Non-recurring task with NONE recurrence

- **Area**: Recurrence
- **Requirements**: FR6, FR7
- **Risk**: Medium

**Preconditions**
- Family with at least one parent and one child.
- User is authenticated as a parent.
- System-wide default reminder policy for single tasks is configured (e.g. same-day 09:00 local when due date exists).

**Steps**
1. Parent creates a task "Pay electricity bill" with:
   - `recurrenceType = NONE`.
   - `dueDate` set to a specific local date and time.
   - Assigned to the parent user only.
2. Observe task details and any reminder-related UI.
3. Mark the task as completed on or before the due date.
4. Re-open the tasks list and detail view.

**Expected Results**
- Task appears as a normal one-off task (no mention of repetition in the UI).
- At most one upcoming reminder is scheduled for this task based on the policy.
- After completion, no additional due date is generated and no further reminders are scheduled.
- Historical notification(s) for this task remain visible (if sent), but no new ones appear after completion.

---

### REC-002 – Daily recurring task – next occurrence after completion

- **Area**: Recurrence
- **Requirements**: FR7, FR11
- **Risk**: High

**Preconditions**
- Family.timeZone is configured (e.g. "Europe/Helsinki").
- Parent is authenticated and can assign tasks to themselves.
- Reminder policy for recurring tasks: one reminder on the same day at a configurable lead time (e.g. 3 hours before due).

**Steps**
1. Parent creates task "Empty dishwasher" with:
   - `recurrenceType = DAILY`.
   - Initial local `dueDate` today at 20:00.
   - Assigned to the parent.
2. Confirm that a single upcoming reminder is scheduled for today (e.g. at 17:00 local).
3. At or after 17:00 but before 20:00 local, verify that a task reminder notification appears.
4. Around 20:00 local, mark the task as completed via the task detail view.
5. Open the task detail again.

**Expected Results**
- Before completion, the task shows as recurring daily with the correct next due date and reminder time in local time.
- The reminder fires exactly once for today’s occurrence (no duplicate notifications for the same due date).
- After marking the task completed:
  - The task’s `dueDate` is updated to tomorrow at 20:00 local (stored as UTC under the hood).
  - A new reminder is scheduled for tomorrow at 17:00 local.
  - UI clearly indicates the task continues to repeat daily.

---

### REC-003 – Weekly recurring task – weekday consistency

- **Area**: Recurrence
- **Requirements**: FR7, FR11
- **Risk**: Medium

**Preconditions**
- Family.timeZone is configured.
- Parent is authenticated.
- Weekly reminder policy is the same as for daily tasks (single reminder per occurrence).

**Steps**
1. On a Wednesday, parent creates a task "Put out recycling bin" with:
   - `recurrenceType = WEEKLY`.
   - Initial local `dueDate` next Wednesday at 19:00.
2. Note the weekday and time shown in the UI for the next occurrence.
3. Complete the task on a Wednesday after the reminder has fired.
4. Check the updated due date and reminder schedule.

**Expected Results**
- The first due date is scheduled for the first Wednesday at 19:00 local.
- A single reminder is scheduled per weekly occurrence based on the policy.
- After completion, the next due date jumps exactly 7 days forward, remaining on Wednesday at 19:00 local.
- No skipped weeks or drift to different weekdays occur, even across month or year boundaries.

---

### REC-004 – Monthly recurring task – end-of-month normalization

- **Area**: Recurrence
- **Requirements**: FR7, FR11
- **Risk**: High

**Preconditions**
- Family.timeZone is configured.
- Parent is authenticated.
- Reminder policy is configured as for other recurring tasks.

**Steps**
1. On January 31, parent creates task "Check smoke alarms" with:
   - `recurrenceType = MONTHLY`.
   - Initial local `dueDate` January 31 at 18:00.
2. Verify due date for February occurrence.
3. Complete the task on the normalized February occurrence date.
4. Verify due date for March occurrence.

**Expected Results**
- For February, where the 31st does not exist:
  - The task’s next `dueDate` is normalized to the last day of February at 18:00 local.
- For March and future months:
  - Due dates continue on the 31st when that day exists, or on the last day when it does not.
- Reminder times follow the normalized due date for each month and fire exactly once per occurrence.
- No gaps or duplicated months appear in the series.

---

## 4. Reminder Timing Scenarios (REM-*)

### REM-001 – Task reminder before due time

- **Area**: Reminders
- **Requirements**: FR11
- **Risk**: Medium

**Preconditions**
- Family.timeZone configured.
- Parent is authenticated.
- Reminder policy for non-recurring tasks: single reminder 2 hours before due time.

**Steps**
1. Parent creates task "Submit school form" with:
   - `recurrenceType = NONE`.
   - `dueDate` today at 16:00 local.
   - Assigned to the parent.
2. Keep the app open or reopen it near 14:00 local.

**Expected Results**
- A Notification row is created and delivered around 14:00 local.
- Notification item clearly indicates:
  - Task title.
  - That it is a task reminder.
  - Relative time (e.g. "Due in 2 hours").
- No additional reminders fire for this task before 16:00.

---

### REM-002 – Task reminder at due time

- **Area**: Reminders
- **Requirements**: FR11
- **Risk**: Medium

**Preconditions**
- Same as REM-001, except policy is configured to fire at due time rather than before.

**Steps**
1. Parent creates task "Start laundry" with `dueDate` today at 18:00 local.
2. Stay signed in through 18:00 local or return shortly after.

**Expected Results**
- A single task reminder appears at or just after 18:00 local.
- Notification clearly indicates the task is now due (e.g. "Due now").
- If the user marks the task as completed, no further reminders for this task fire.

---

### REM-003 – Overdue task reminder when user returns

- **Area**: Reminders
- **Requirements**: FR11
- **Risk**: High

**Preconditions**
- Reminder policy: one reminder at due time; overdue tasks appear as overdue in the UI.
- Parent is authenticated initially, then logs out/ closes app.

**Steps**
1. Parent creates task "Pay rent" with `dueDate` today at 12:00 local.
2. Log out or close the app before 11:55 local and stay away until after 12:30.
3. Log back in at 13:00 local and open the notification list and tasks view.

**Expected Results**
- At least one reminder notification exists for this task, marked as overdue (e.g. "Due 1 hour ago").
- The task appears as overdue in task lists and detail views.
- No duplicate overdue notifications are created each time the user opens the app; the overdue state is reflected using existing notification(s) and current time.

---

### REM-004 – Event reminder before start

- **Area**: Reminders
- **Requirements**: FR10
- **Risk**: Medium

**Preconditions**
- Reminder policy for events: one reminder 1 hour before start time.
- Parent is authenticated and has at least one event category.

**Steps**
1. Parent creates event "Doctor appointment" for today at 15:00 local and assigns themselves.
2. Open the app around 14:00 local.

**Expected Results**
- A single event reminder notification appears at or just after 14:00 local.
- Notification includes:
  - Event title.
  - Time until start (e.g. "Starts in 1 hour").
  - Type label (e.g. "Event reminder").
- Event card in calendar or list view shows an upcoming/reminder indicator.

---

### REM-005 – Event reminder at start time

- **Area**: Reminders
- **Requirements**: FR10
- **Risk**: Medium

**Preconditions**
- Reminder policy configured to fire at event start time.

**Steps**
1. Parent creates event "Online class" for today at 10:00 local.
2. Stay signed in through 10:00 local or return at ~10:05.

**Expected Results**
- Event reminder fires once at or shortly after 10:00 local.
- Notification uses language like "Starts now".
- Event is shown as current/ongoing in calendar views.

---

### REM-006 – Event reminder for already-started event

- **Area**: Reminders
- **Requirements**: FR10
- **Risk**: High

**Preconditions**
- Same reminder policy as REM-004 (1 hour before start).

**Steps**
1. Parent creates event "Parent–teacher meeting" for today at 09:00 local.
2. Log out or close the app before 08:00 local.
3. Log back in at 09:15 local and open notifications.

**Expected Results**
- A reminder exists indicating the event has already started (e.g. "Started 15 minutes ago").
- No separate "before start" notification is created at login time if it was missed.
- Calendar clearly shows the event as in progress or already in the past, consistent with the reminder.

---

## 5. Timezone and DST Scenarios (TZ-*)

### TZ-001 – Event reminder across DST start (spring forward)

- **Area**: Timezone & DST
- **Requirements**: FR10, NFR5
- **Risk**: High

**Preconditions**
- Family.timeZone = "Europe/Helsinki" (DST starts at 03:00, offset +2 → +3).
- Reminder policy for events: 1 hour before start.

**Steps**
1. Parent creates event "Sunday brunch" for the DST transition day at 10:00 local (e.g. 2026-03-29 10:00).
2. Confirm in UI that event shows at 10:00 local on that day.
3. Observe the scheduled reminder time.

**Expected Results**
- Event is stored with startTime in UTC corresponding to 10:00 local after the DST shift.
- Reminder is scheduled for 09:00 local (after the DST change), not based on a fixed UTC offset.
- User receives the reminder at 09:00 local; no off-by-one-hour issues occur.

---

### TZ-002 – Daily recurring task across DST end (fall back)

- **Area**: Timezone & DST
- **Requirements**: FR7, FR11, NFR5
- **Risk**: High

**Preconditions**
- Family.timeZone = "Europe/Helsinki" (DST ends, offset +3 → +2).
- Recurring task reminder policy: reminder at 17:00 local for tasks due at 20:00 local.

**Steps**
1. Before DST end, parent creates daily recurring task "Give vitamins" with:
   - `recurrenceType = DAILY`.
   - Initial due date at 20:00 local on a day before DST ends.
2. Let the series run across the DST end date without modifying the task.
3. Observe reminder times for the days before and after the DST change.

**Expected Results**
- For all days, reminders fire at 17:00 local and due dates are at 20:00 local, even though the underlying UTC offsets change.
- No duplicate or missing reminders occur on the DST transition day.
- UI always shows consistent local times; there are no sudden shifts to 16:00 or 18:00.

---

### TZ-003 – Cross-day reminder when local date differs from UTC

- **Area**: Timezone & DST
- **Requirements**: FR10, FR11, NFR5
- **Risk**: Medium

**Preconditions**
- Family.timeZone is ahead of UTC (e.g. "Asia/Tokyo").
- Reminder policy: fire 2 hours before local due/ start.

**Steps**
1. Parent creates a task "Prepare lunchbox" with `dueDate` at 00:30 local on a given calendar day.
2. Parent also creates an event "Early train" at 01:00 local the same day.
3. Observe reminder times and dates in the UI and internal logs (if available).

**Expected Results**
- Reminders are scheduled at 22:30 local (for task) and 23:00 local (for event) on the previous calendar day in UTC terms.
- In the UI, all times are presented using the family’s local date and time (the same calendar day as the user expects), with no confusion due to UTC storage.
- No reminders appear on an unexpected day from the user’s perspective.

---

## 6. Overlapping and Cross-Day Behavior (OV-*)

### OV-001 – Multiple reminders in the same 5-minute window

- **Area**: Overlap
- **Requirements**: FR10, FR11, NFR2
- **Risk**: High

**Preconditions**
- Reminder policies for tasks and events are configured such that multiple reminders can coincide.
- Parent is authenticated on desktop.

**Steps**
1. Create three items for the same user:
   - Task A due at 18:00 local with reminder at 18:00.
   - Task B due at 18:05 local with reminder at 18:00.
   - Event C starts at 18:00 local with reminder at 18:00.
2. Keep the app open around 18:00 local.

**Expected Results**
- All three reminders appear within a short window, without the UI freezing or collapsing the list in a confusing way.
- Notifications are clearly distinguishable (titles, icons, labels).
- The global notification badge reflects the correct unread count.
- Marking or clearing one notification does not incorrectly affect others.

---

### OV-002 – Overlapping event and task around midnight

- **Area**: Overlap
- **Requirements**: FR7, FR10, FR11
- **Risk**: Medium

**Preconditions**
- Family.timeZone configured.

**Steps**
1. Parent creates event "Midnight movie" starting at 23:30 local and ending at 01:00 local next day.
2. Parent creates recurring daily task "Close windows" due at 00:15 local.
3. Configure reminders:
   - Event reminder 30 minutes before start (23:00 local).
   - Task reminder at due time (00:15 local).
4. Observe calendar and task views and the notifications list before and after midnight.

**Expected Results**
- Calendar displays the event spanning two days correctly.
- The task appears on the correct calendar day in task views.
- Event and task reminders fire at their configured local times on the correct dates.
- No off-by-one-day or ordering issues in the notification list (e.g., task incorrectly shown as belonging to the previous day).

---

## 7. UX and Usability Scenarios (UX-*)

### UX-001 – Desktop notification visibility and basic actions

- **Area**: UX
- **Requirements**: FR10, FR11, NFR2
- **Risk**: Medium

**Preconditions**
- Parent is authenticated on a desktop browser.
- At least one pending task reminder and one event reminder exist.

**Steps**
1. From any main page (calendar or tasks), trigger at least one new reminder (e.g., wait until its scheduled time).
2. Observe the global notification icon and badges.
3. Open the notification list.
4. Open a notification to navigate to the related event or task.
5. Mark another notification as read and clear another.

**Expected Results**
- Global notification icon updates badge count as new reminders arrive and as items are read/cleared.
- Notification list is accessible via keyboard and screen reader per UX guidance.
- Opening a notification navigates to the correct event/task detail without losing the ability to return to the list.
- Marking as read changes visual state but keeps the item available; clearing removes it or moves it to a cleared section (per final design).

---

### UX-002 – Mobile notification list and clearing behavior

- **Area**: UX
- **Requirements**: FR10, FR11, NFR2
- **Risk**: Medium

**Preconditions**
- Parent is authenticated on a mobile device.
- Several unread notifications exist (mix of tasks and events).

**Steps**
1. Navigate to the mobile app’s main view (e.g. calendar or tasks).
2. Open the notification screen from the global notification icon.
3. Scroll through the list and verify labels for task vs event reminders.
4. Clear one notification using the primary action (tap or swipe).
5. Use any bulk action such as "Mark all as read" if available.

**Expected Results**
- Notification list fits on mobile screens with readable text and tappable targets.
- Swiping or tapping behaves as documented in UX guidelines (e.g. swipe to clear, with undo snackbar).
- Bulk actions are clearly labeled and show confirmation before irreversible deletion.
- Users can easily return to the previous context and the notification icon reflects updated unread counts.

---

## 8. Notes on Traceability and Automation Mapping

- Each scenario ID (e.g. `REC-002`, `TZ-001`) can map to one or more automated tests:
  - Unit tests for reminder policy and scheduler services.
  - Integration/API tests covering UTC/local conversions and persistence.
  - UI tests for notification list behavior.
- A separate requirement traceability and acceptance test matrix can reference these IDs per requirement (FR7, FR10, FR11, NFR2, NFR3, NFR5) to track coverage.
- High-risk scenarios (`REC-002`, `REC-004`, `REM-003`, `REM-006`, `TZ-001`, `TZ-002`, `OV-001`) should be prioritized for deeper exploratory and automated testing once the underlying implementations are in place.
