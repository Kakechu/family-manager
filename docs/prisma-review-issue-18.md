# Prisma Schema Review – Issue #18

## 1. Scope

Comparison of the implemented Prisma data model and migrations against the documented schema in docs/database_structure.md and the intended domain model for FamilyManager.

## 2. High-level Alignment

Overall, the Prisma schema in prisma/schema/schema.prisma and the initial migration in prisma/schema/migrations/20260410081018_add_default_task_is_complete/migration.sql match the documented entities, relationships, and enums:

- All core entities (Family, User, FamilyMember, Event, EventCategory, Task, TaskCategory, Comment, Notification, TaskAssignment, EventAssignment) are present.
- Enums UserRole, FamilyMemberRole, TaskRecurrenceType, NotificationType, and AttendanceStatus match docs/database_structure.md.
- Primary keys and foreign keys align with the documented relationships, including composite PKs on TaskAssignment and EventAssignment.

## 3. Notable Differences and Observations

### 3.1 Field Optionality vs. Domain Expectations

These differences are not strictly mismatches with docs/database_structure.md (which does not mark fields as optional) but are relevant to the intended UX/domain model:

- Task.description
  - Prisma: required String.
  - UX docs (docs/ux-calendar-and-tasks.md §3.1): description is optional.
  - Impact: API and UI must always send a non-empty description; otherwise writes will fail.
  - Recommendation: Consider making description optional at the DB level (String?) and adjusting API validation accordingly.

- Task.dueDate
  - Prisma/migration: required DateTime (NOT NULL).
  - UX docs (§3.1): due date is optional but recommended.
  - Impact: Current schema cannot represent truly no-due-date tasks; clients must always provide some due date.
  - Recommendation: Decide whether the product intends to support tasks without a due date. If yes, dueDate should be nullable in the schema and migration.

- Event.description
  - Prisma/migration: required String.
  - UX docs (§2.1): description is optional in the event creation form.
  - Impact: Same pattern as Task.description; clients must send a value even when conceptually omitted.
  - Recommendation: Consider making description optional (String?) if events are expected to exist without descriptions.

These look like likely unintended mismatches between the UX/domain model and the current schema, rather than intentional constraints.

### 3.2 Relationship and Constraint Behavior

Current foreign key constraints in migration.sql use RESTRICT on delete for most relationships:

- User.familyId, FamilyMember.familyId, Event.familyId, Task.familyId, Task.categoryId, Event.categoryId, Comment.taskId, Comment.userId, TaskAssignment.*, EventAssignment.* all use ON DELETE RESTRICT.
- FamilyMember.userId uses ON DELETE SET NULL, matching the optional linkage between a user and a family member.
- Notification.taskId and Notification.eventId use ON DELETE SET NULL, which matches the design of notifications as optional references.

This behavior is consistent with database_structure.md and preserves data integrity, but leads to the following operational considerations:

- Families, tasks, and events cannot be deleted while dependent rows exist, which is safe but requires application-level cascade handling if deletions are needed.
- There is no soft-delete mechanism modeled yet; if added later, schema and constraints will need to be revisited.

At this stage these choices appear intentional and safe.

### 3.3 Migration Layout

- Active migration directory is prisma/schema/migrations/20260410081018_add_default_task_is_complete/ with a full initial schema creation, not just a small delta.
- The top-level prisma/migrations directory is currently empty.

Assumption:
- The team intends to use prisma/schema/schema.prisma and prisma/schema/migrations as the authoritative location (possibly via a custom workflow). This should be documented for contributors to avoid confusion with the default prisma/migrations path.

## 4. Migration Safety Assessment

Based on migration.sql:

- The migration creates all tables, enums, and constraints from scratch with no destructive operations (no DROP/ALTER existing columns), which is safe for initial setup.
- Applying this migration on an empty database is low risk.
- Applying this migration to a non-empty database with prior, incompatible schema would fail; there are no transitional steps or backfills.

Key safety notes:

- Due to NOT NULL constraints on Task.description, Task.dueDate, and Event.description, any future migration that makes these fields optional will require careful ALTER TABLE steps and default handling.
- Foreign keys are appropriately constrained; failure modes will be clear (constraint violations) rather than silent data corruption.

## 5. Recommendations

### 5.1 Schema / Domain Alignment

- Decide on the intended behavior for optional fields in the domain model:
  - Tasks without a description.
  - Tasks without a due date.
  - Events without a description.
- If the intent matches the UX docs (these fields optional), plan a follow-up change set:
  - Update prisma/schema/schema.prisma to make the fields nullable.
  - Generate and review Prisma migrations that perform safe ALTER TABLE statements.
  - Update API validation (Zod schemas) and frontend forms to allow empty values while keeping good UX hints (e.g., recommended but not required).

### 5.2 Documentation Alignment

- Add a brief note in docs/database_structure.md clarifying which fields are conceptually optional vs. required, to keep it aligned with UX and Prisma.
- Document the chosen Prisma schema location (prisma/schema vs prisma/) in contributor docs or README to avoid confusion.

### 5.3 Follow-up Issues (Proposed)

- Issue: "Align Task and Event optional fields with UX" – track schema and API changes to make Task.description, Task.dueDate, and Event.description optional if confirmed by product.
- Issue: "Clarify Prisma schema and migrations location" – document the prisma/schema structure and ensure tooling (e.g., package scripts) point to the same location.

## 6. Risk Summary

- Current schema is safe and consistent with database_structure.md but may not fully reflect the UX expectations for optional fields.
- Changing NOT NULL columns later will require careful migrations, but no blocking constraints are present today.
- As long as clients always provide description and dueDate where required, there are no immediate data integrity risks; the main risk is friction between UX design and backend constraints.
