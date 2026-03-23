---
applyTo: "**/*.{test,spec}.{ts,tsx,js,jsx}"
description: "Guidance for writing and maintaining FamilyManager automated tests."
---

# Test Instructions

## Scope
Apply these instructions when editing unit, integration, and API tests.

## Test Philosophy
- Optimize for deterministic, trustworthy feedback.
- Test behavior and outcomes, not implementation details.
- Use explicit arrange-act-assert structure.

## Coverage Priorities
- Event lifecycle: create, categorize, assign, filter
- Task lifecycle: create, recur, complete, comment
- Notification and reminder behavior
- Authentication and authorization boundaries
- Validation failures and error handling

## Quality Rules
- Keep test names descriptive and scenario-based.
- Avoid flaky patterns: implicit timing dependencies, shared mutable state.
- Prefer isolated fixtures and predictable factories.
- Assert both success and failure paths for critical flows.

## Integration and API Tests
- Verify response status, shape, and key fields.
- Include edge cases for missing permissions and invalid payloads.
- Protect against regressions for previously fixed defects.

## Maintenance
- Keep helpers reusable but simple.
- Remove obsolete tests when behavior is intentionally changed.
- Document known gaps and next high-value tests.
