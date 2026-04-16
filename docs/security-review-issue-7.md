# Security Review Report - Issue #7

## Scope and Assumptions

- Scope: backend auth, authorization, and data exposure controls in API modules under apps/api/src.
- Focus areas: authentication, role authorization, family scoping, notifications, and credential handling.
- Assumption: Event and task categories are intended to be shared/global records (no familyId on model).
- Method: static review + targeted automated tests for critical authorization paths.

## Findings by Severity

### High

1. Cross-family account linking was possible in family member mutations
- Impact: a parent could link a user account from another family to a family member in their own family by setting userId, creating cross-family identity linkage and potential data integrity/authorization confusion.
- Repro (pre-fix):
  1. Authenticate as parent in family A.
  2. Call POST /api/v1/family-members with a userId belonging to family B.
  3. The mutation accepted the link because only familyId for the family member row was enforced.
- Impacted paths:
  - apps/api/src/modules/family-members/routes.ts
  - prisma/schema/schema.prisma (relationship allows userId FK without family consistency constraint)
- Fix:
  - Added server-side validation that linked userId must belong to req.auth.familyId.
  - Added validation that linked userId is not already associated with another family member.

### Medium

2. Internal exception details were returned to clients in category creation failures
- Impact: raw error objects from Prisma/runtime could be returned in API responses, increasing information disclosure risk.
- Repro (pre-fix):
  1. Trigger failure in category create path (e.g., DB exception).
  2. Response included error.details with raw error object.
- Impacted paths:
  - apps/api/src/modules/event-categories/routes.ts
  - apps/api/src/modules/task-categories/routes.ts
- Fix:
  - Removed raw error object from client response details.
  - Added server-side logging only.

3. JWT secret silently defaulted to dev-secret in production if misconfigured
- Impact: production misconfiguration could result in weak, predictable token signing secret.
- Repro (pre-fix):
  1. Start API with NODE_ENV=production and AUTH_JWT_SECRET unset.
  2. Tokens still signed/verified using hardcoded fallback secret.
- Impacted path:
  - apps/api/src/shared/utils/jwt.ts
- Fix:
  - Enforced explicit AUTH_JWT_SECRET in production; app now fails closed if missing.

### Low

4. Authorization header parsing accepted non-standard bearer patterns
- Impact: token parsing behavior was permissive due to string replacement, increasing ambiguity and parser confusion risk.
- Repro (pre-fix):
  1. Send crafted Authorization header containing Bearer substring not at prefix.
  2. Replacement-based extraction could produce unintended token values.
- Impacted path:
  - apps/api/src/middleware/auth.ts
- Fix:
  - Switched to strict startsWith("Bearer ") extraction.

## Exploitability Notes

- Finding 1 is directly exploitable by authenticated parent users and affects trust boundaries between families.
- Finding 2 primarily aids attackers during probing by exposing internal implementation details.
- Finding 3 requires deployment misconfiguration but has high blast radius if present.
- Finding 4 is low-impact hardening; no direct privilege escalation observed from this alone.

## Recommended Fixes

Implemented in this issue:
- Family-member linked-user validation and uniqueness checks at API level.
- Sanitized error responses in category creation endpoints.
- Production-safe JWT secret handling.
- Strict Bearer token parsing.

Recommended follow-up engineering:
- Add DB-level invariant for cross-family user/member linkage (e.g., trigger or schema redesign) to complement API checks.
- Add global auth hardening controls:
  - login rate limiting and lockout/backoff,
  - optional refresh-token/session revocation architecture,
  - centralized security headers and audit logging.

## Authorization Verification Matrix (Critical Resources)

### Family Members
- Positive path verified: parent can create family member.
  - apps/api/src/modules/family-members/routes.test.ts
- Negative path verified: child cannot create family member (403).
  - apps/api/src/modules/family-members/routes.test.ts
- Abuse negative path verified: cross-family userId rejected (400).
  - apps/api/src/modules/family-members/routes.test.ts

### Events
- Positive path verified: parent can create event.
  - apps/api/src/modules/events/routes.test.ts
- Negative path verified: child cannot create event (403).
  - apps/api/src/modules/events/routes.test.ts

### Tasks
- Positive path verified: parent can create task.
  - apps/api/src/modules/tasks/routes.test.ts
- Negative path verified: child cannot create task (403).
  - apps/api/src/modules/tasks/routes.test.ts

### Notifications
- Positive path verified: parent can run reminder scheduler endpoint.
  - apps/api/src/modules/notifications/routes.test.ts
- Negative path verified: child cannot run reminder scheduler endpoint (403).
  - apps/api/src/modules/notifications/routes.test.ts

## Password and Credential Handling Review

- Password hashing uses bcrypt with 12 rounds.
  - apps/api/src/shared/utils/password.ts
- Login returns generic invalid credential message for both unknown user and bad password.
  - apps/api/src/modules/auth/routes.ts
- Access token is set in HttpOnly cookie with SameSite strict and environment-based secure flag.
  - apps/api/src/modules/auth/routes.ts
- Improvement implemented: production JWT secret must be explicitly configured.
  - apps/api/src/shared/utils/jwt.ts

## Residual Risks

- No rate limiting on authentication endpoints (brute-force risk).
- No refresh-token/session management yet (session revocation and device/session controls are limited).
- Cross-family linkage is enforced at API layer but not guaranteed by DB constraint.
- Category resources are global; if product intent changes to family-specific categories, a separate authz/data model update is needed.

## Security Test Recommendations

1. Add integration tests with real auth middleware (not mocked) for parent/child role enforcement across family-scoped write endpoints.
2. Add integration tests for IDOR attempts across families on assignment update/delete operations.
3. Add auth endpoint abuse tests for login throttling once rate limiting is implemented.
4. Add deployment configuration test to fail startup when AUTH_JWT_SECRET is missing in production mode.
