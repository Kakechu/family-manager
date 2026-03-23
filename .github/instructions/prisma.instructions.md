---
applyTo: "**/prisma/**/*.{prisma,sql}"
description: "Guidance for Prisma schema, migrations, and data-safety changes in FamilyManager."
---

# Prisma and Migration Instructions

## Scope
Apply these instructions when editing Prisma schema files, SQL migrations, or data migration scripts.

## Modeling Rules
- Keep entity relationships aligned with docs/database_structure.md.
- Make ownership and cardinality explicit for Family, User, Event, Task, and assignment entities.
- Prefer additive schema evolution over destructive changes.

## Migration Safety
- Avoid data-destructive operations unless explicitly requested and documented.
- For renames or type changes, include data backfill or transition steps.
- Keep migrations deterministic and reversible where practical.
- Document assumptions and rollback considerations in the summary.

## Integrity and Isolation
- Preserve family-level data isolation in constraints and query patterns.
- Protect referential integrity for assignment and comment relationships.
- Review nullable/required transitions for compatibility with existing records.

## Verification
- Validate that schema and migration changes are consistent with API validation rules.
- Add or update integration tests for behavior affected by schema changes.
- Call out production risks and operational steps for deployment.
