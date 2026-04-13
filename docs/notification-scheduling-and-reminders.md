# Notification Scheduling and Timezone-Safe Reminders

## Goal

Design how FamilyManager schedules and delivers event and task reminders using the existing Notification model, in a timezone-safe and recurrence-aware way.

## Assumptions

- Domain and schema follow docs/project_description.md and docs/database_structure.md.
- Events and tasks are created and viewed in a user-facing local timezone (e.g. the family’s primary timezone or a per-user setting).
- All timestamps persisted in the database remain in UTC as ISO-8601 strings.
- Authentication provides userId and familyId for all reminder-related operations.
- Notification rows represent concrete, user-visible notifications (e.g. an in-app banner or a delivered email/push), not abstract reminder rules.

---

## Proposed Architecture

### High-Level Components

- **Reminder policy layer**
  - Defines how many reminders to send, and how far in advance, for events and tasks.
  - Interprets recurrenceType on tasks to compute logical occurrences.
- **Scheduling layer**
  - Computes future reminder fire times in UTC based on local event/task times and reminder policies.
  - Materializes due reminders into Notification rows for the target user(s).
- **Delivery layer (out of scope for this issue)**
  - Translates Notification rows into actual delivery channels (in-app, email, push).

The scheduling and reminder policy logic will live in a dedicated service (e.g. apps/api/src/modules/notifications/reminderScheduler.ts) that can be invoked by background jobs or application-level schedulers.

---

## Timezone Strategy

### Source of Truth

- Introduce a **family-level timezone** setting (e.g. Family.timeZone: string, IANA zone such as "Europe/Helsinki").
- Optionally support a **per-user override** later (e.g. User.timeZone) for traveling parents or shared custody; initial design assumes family-level is sufficient.
- Event.startTime and Task.dueDate are interpreted as **local wall-clock times** in the relevant timezone when created or edited.

### Storage Rules

- Persist Event.startTime, Event.endTime, and Task.dueDate as UTC timestamps.
- When creating or updating these fields:
  - Convert the user-provided local time (date + time + family/user timezone) to UTC.
- When displaying events and tasks to the user:
  - Convert stored UTC timestamps back to the user’s effective timezone.

### DST and Edge Cases

- Recurring tasks and reminders follow **local wall-clock time semantics**:
  - A daily reminder at 08:00 local should always appear at 08:00 local, even when UTC offset changes due to DST.
  - Internally, this means: for each occurrence, compute the local occurrence datetime in the timezone, then convert to UTC for storage/scheduling.
- For times that do not exist or are ambiguous due to DST transitions:
  - **Spring forward (missing hour)**: if 02:30 does not exist, normalize to 03:00 local for that day.
  - **Fall back (repeated hour)**: treat the first occurrence of the local time as the reminder anchor.
- These rules must be applied consistently in the reminder policy implementation, and should be covered by tests for representative timezones.

---

## Reminder Rules and Lead Times

### Events

- Default policy (MVP):
  - One reminder per user per event at a configurable lead time before Event.startTime (e.g. 1 hour before).
- Future extensions (not implemented in MVP, but supported by design):
  - Per-event override of lead time (e.g. 10 minutes vs 1 day).
  - Multiple reminders (e.g. 1 day before and 1 hour before).

**Computation (per event, per assignee user):**

1. Determine the event’s effective timezone (family or user).
2. Take Event.startTime (UTC) and convert it to local time.
3. Subtract the configured lead time (e.g. 60 minutes) in the local timezone.
4. Convert the resulting local reminder time back to UTC → reminderFireAtUtc.
5. Schedule a notification for reminderFireAtUtc for each target user.

### Tasks (Non-Recurring)

- Default policy (MVP):
  - One reminder per user per task with dueDate at a configurable lead time before Task.dueDate (e.g. same-day at 09:00 local, or N hours before due date).
- For tasks without dueDate:
  - No automatic time-based reminders are scheduled by default; future design may allow explicit reminder times.

**Computation (per task, per assignee user):**

1. If dueDate is null → no reminder.
2. Determine the task’s effective timezone.
3. Convert Task.dueDate (UTC) to local time.
4. Apply the lead time rule (e.g. local due date at 17:00 → reminder at same local day 09:00).
5. Convert the reminder time back to UTC → reminderFireAtUtc.
6. Schedule a notification for reminderFireAtUtc.

### Tasks (Recurring)

- Recurrence is modeled via Task.recurrenceType: NONE, DAILY, WEEKLY, MONTHLY.
- The core design principle: **do not pre-generate infinite future reminders**. Instead, generate reminders incrementally around the present.

**Occurrence and reminder generation strategy:**

- For a recurring task, define the sequence of logical due dates in local time:
  - DAILY: every day at the same local time as the original dueDate.
  - WEEKLY: every week on the same weekday and local time.
  - MONTHLY: same day-of-month and local time; if the day does not exist (e.g. 31st in shorter months), normalize to the last day of the month.
- At any point in time, generate reminders only for occurrences within a rolling window (e.g. now..now+14 days) to bound work.
- When a user completes a recurring task occurrence:
  - Mark the current underlying Task instance as completed as of completion time.
  - Compute the next logical occurrence’s due date in local time.
  - Update Task.dueDate to the next occurrence’s due date (recomputed and stored as UTC).
  - Schedule a new reminder for that next occurrence (using the non-recurring task reminder rules above).

This strategy keeps the data model simple (single Task row per recurring series) while ensuring at most one upcoming reminder per user per recurring task.

---

## Scheduling Approach

### Scheduling Engine Options

- **Cron-based in-process scheduler** (e.g. node-cron):
  - Pros: Simple to integrate, no extra infrastructure.
  - Cons: Coupled to a single app instance; harder to scale horizontally and ensure exactly-once behavior.
- **Dedicated job queue / worker** (recommended for future):
  - Pros: Better reliability, observability, and scaling.
  - Cons: Requires additional infra (Redis, BullMQ, etc.).

### MVP Strategy

For the MVP, use a **time-based polling scheduler** running inside the API process or a separate worker process:

- A periodic job (e.g. every minute) runs the **reminder scheduler service**:
  - Finds all reminder candidates whose reminderFireAtUtc is <= now and not yet materialized as Notification rows.
  - Creates Notification rows for those reminders.
- The job uses transactional queries to avoid race conditions when multiple instances run.

### Persisted Reminder Metadata

To keep the Notification model focused on concrete user-visible notifications:

- Introduce a separate conceptual **Reminder** record (or extend existing entities) to capture scheduling metadata:
  - Fields (conceptual):
    - id
    - userId
    - familyId
    - taskId? / eventId?
    - type (TASK_REMINDER or EVENT_REMINDER)
    - reminderFireAtUtc (timestamp)
    - status: PENDING | SENT | FAILED | CANCELLED
    - retryCount (integer)
  - These may eventually map to Prisma models and migrations; this issue focuses on documenting behavior, not implementing schema changes.

- The scheduler job processes Reminder records:
  - For each PENDING reminder where reminderFireAtUtc <= now:
    - Create a Notification row for the associated user and resource.
    - Mark the Reminder as SENT (or FAILED if downstream delivery fails).

---

## Failure, Retry, and Idempotency

### Failure Modes

- Database write failures when creating Notification rows.
- Delivery infrastructure failures (email/push) after Notification creation.
- Job interruptions or overlaps leading to duplicate processing.

### Idempotency Strategy

- Treat Notification creation as idempotent per logical reminder key:
  - Logical key: (userId, type, taskId?, eventId?, occurrenceDateTime).
  - Enforce uniqueness at the Reminder level (e.g. unique index or explicit check) so that the scheduler only ever sees one Reminder per key.
- The scheduler must:
  - Use transactions when transitioning a Reminder from PENDING to SENT and creating the corresponding Notification.
  - Be safe to re-run over the same time window without generating duplicate Notifications.

### Retry Behavior

- For failures when creating Notification rows:
  - Leave the Reminder in PENDING and rely on the next scheduler run.
  - Optionally, increment retryCount and stop retrying after a configurable maximum.
- For downstream delivery failures (out of scope for this issue):
  - Keep the Notification row but track delivery status in channel-specific tables or metadata.
  - Retries at the channel level must be idempotent per Notification.id.

---

## Interaction Between Recurrence and Reminders

- Each recurring task maintains a single upcoming occurrence via Task.dueDate.
- Reminder generation rules:
  - At task creation (recurrenceType != NONE):
    - Compute the first occurrence’s due date in local time and store as Task.dueDate (UTC).
    - Schedule a Reminder for that occurrence.
  - On completion:
    - Compute the next occurrence’s due date in local time.
    - Update Task.dueDate to the next occurrence (UTC).
    - Schedule a new Reminder for that next occurrence.
- This ensures:
  - At most one active Reminder per user per recurring task at any given time.
  - Clear mapping between Task state, dueDate, and Notifications visible to the user.

---

## Examples

### Example 1 – Event Reminder with DST

- Family.timeZone = "Europe/Helsinki".
- Event.startTime (local) = 2026-03-29 10:00 (DST starts at 03:00, UTC offset changes from +2 to +3).
- Lead time = 1 hour.

Flow:

1. User creates event at 2026-03-29 10:00 local.
2. Backend converts 10:00 local to UTC (07:00 UTC) and stores Event.startTime = 2026-03-29T07:00:00Z.
3. Reminder policy computes local reminder time = 09:00 local.
4. 09:00 local → 06:00 UTC; scheduler stores reminderFireAtUtc = 2026-03-29T06:00:00Z.
5. At 06:00 UTC, scheduler materializes a Notification for the user.

### Example 2 – Daily Recurring Task

- Family.timeZone = "Europe/Helsinki".
- Task: "Empty dishwasher", recurrenceType = DAILY.
- Initial local due time: 20:00.
- Lead time: same day at 17:00.

Flow:

1. User creates task with initial due date 2026-04-01 20:00 local.
2. Backend stores Task.dueDate = 2026-04-01T17:00:00Z (UTC equivalent).
3. Reminder policy computes first reminder at 17:00 local → stores reminderFireAtUtc accordingly.
4. When the task is marked completed on 2026-04-01:
   - Next occurrence due date = 2026-04-02 20:00 local.
   - Update Task.dueDate to that date/time in UTC.
   - Schedule a new Reminder for 2026-04-02 17:00 local.

---

## Security and Privacy Notes

- All reminder scheduling and Notification creation must respect family-level data isolation:
  - Queries for Reminder and Notification entities are always scoped by familyId and userId from auth context.
- Reminder and Notification messages must not leak sensitive data about other families or users.
- Timezone settings should be editable only by authorized roles (e.g. PARENT for family-level timezone).

---

## Open Questions and Trade-Offs

- Where to persist timezone settings:
  - Family-level only (simpler) vs. per-user overrides (more flexible but complex).
- Whether to introduce a dedicated Reminder Prisma model in the MVP or delay until after basic in-app notifications work.
- How aggressively to pre-generate reminders:
  - Rolling window size (e.g. 7 vs 14 vs 30 days) impacts scheduler workload and UX.
- Which external delivery channels to support first (in-app only vs email vs push) and how to model their statuses.

---

## Recommended Next Steps

- Add or refine database fields for family/user timezone and (optionally) Reminder metadata.
- Implement a reminder scheduler service in the notifications module following this design.
- Add unit and integration tests covering:
  - Timezone and DST behavior for events and recurring tasks.
  - Rolling-window reminder generation and idempotent Notification creation.
- Coordinate with testing-engineer and security-reviewer agents to review this design and refine failure handling and privacy guarantees.
