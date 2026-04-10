# Authentication and Authorization Design

## Goals

- Require authenticated users for all personal and family-specific data.
- Protect user credentials with modern password hashing.
- Enforce family-level isolation so data never leaks across families.
- Support parent/child roles and future authorization rules without large rewrites.

## Assumptions

- Backend: Express + TypeScript + Prisma + PostgreSQL.
- Frontend: React + TypeScript, using Axios for HTTP.
- Existing database entities from database_structure.md are the source of truth (User, Family, FamilyMember, Event, Task, etc.).
- UserRole enum exists with at least `PARENT` and `CHILD`.

---

## High-Level Approach

### Authentication Strategy

- Use **email + password** based login.
- Use **JWT access tokens** for API authentication.
- Store access token in a **HttpOnly, Secure, SameSite=strict cookie** to avoid XSS and minimize CSRF risk.
- Use a **short-lived access token** (e.g. 15 minutes) and a **refresh token** stored server-side (database) to enable session continuation without re-entering credentials.
- Support **logout** and **refresh token revocation**.

### Authorization Strategy

- Use **role-based access control (RBAC)** based on `User.role` (PARENT vs CHILD).
- Enforce **family scoping** on all queries via `familyId`.
- Use **resource-level ownership checks** where needed (`createdBy`, `userId`, assignments) and centralize these rules in service/middleware functions.

---

## Backend Architecture

### Modules

- `apps/api/src/modules/auth`
  - Routes: login, register, refresh, logout, profile.
  - Services: password hashing and verification, token generation, session/refresh management.
- `apps/api/src/modules/users`
  - User querying and profile updates (non-authentication concerns).
- Shared auth utilities under `apps/api/src/shared` or `packages/shared` for:
  - JWT signing/verification.
  - Express middlewares (`authenticate`, `requireRole`, `requireFamilyAccess`).

### Password Handling

- Store only a **password hash** in `User.passwordHash`.
- Use a modern hashing algorithm:
  - Prefer **Argon2id** (e.g. `argon2` library) or **bcrypt** with a work factor (e.g. cost 12 or higher depending on performance).
- On registration:
  - Validate password strength (length, complexity as desired).
  - Hash the password with a per-password salt.
  - Store the resulting hash in `passwordHash`.
- On login:
  - Fetch user by email.
  - Use the hashing library’s `verify` method to compare the submitted password with `passwordHash`.
  - Always respond with a generic error on failure (do not leak which field is wrong).

### JWT Tokens

- **Access token contents (JWT claims):**
  - `sub`: user id.
  - `familyId`: current user family id.
  - `role`: user role (`PARENT` / `CHILD`).
  - `iat`, `exp`: issuance and expiry times.
- **Access token lifetime:** ~15 minutes.
- **Signing:**
  - Use a strong secret stored in environment variables (e.g. `AUTH_JWT_SECRET`).
  - Use HS256 or similar symmetric algorithm.

### Refresh Tokens and Sessions

- Implement refresh tokens to avoid long-lived access tokens.
- Persist refresh tokens in a new `UserSession` table (Prisma model) or similar:
  - `id` (PK)
  - `userId` (FK → User)
  - `refreshTokenHash` (hash of random token string, not the token itself)
  - `createdAt`, `expiresAt`
  - `ipAddress` and `userAgent` (optional for security/audit)
- **Refresh token lifecycle:**
  - On login, create a cryptographically random refresh token (e.g. 256-bit), hash it, store the hash in `UserSession`, and send the raw token in a **HttpOnly, Secure cookie**.
  - On refresh, verify the incoming refresh token against stored hashes and expiry.
  - If valid, issue a new access token (and optionally rotate the refresh token).
  - On logout, delete the corresponding `UserSession` entry.
- Optionally support multiple concurrent sessions per user (one per device/browser).

### Cookie Configuration

- Access token cookie:
  - Name: e.g. `fm_access_token`.
  - `HttpOnly: true`, `Secure: true`, `SameSite: 'strict'` (or `lax` if needed for UX).
  - Short `maxAge` aligned with token expiry.
- Refresh token cookie:
  - Name: e.g. `fm_refresh_token`.
  - Same flags as access token, but longer `maxAge` (e.g. 7–30 days).
- For local development without HTTPS, consider a relaxed `Secure` setting behind a configuration flag, but enforce HTTPS in production.

---

## Express Middleware and Request Flow

### 1. Authentication Middleware (`authenticate`)

- Responsibility:
  - Read access token from the HttpOnly cookie.
  - Verify JWT signature and expiration.
  - On success, attach a `auth` object to `req` (e.g. `req.auth = { userId, familyId, role }`).
  - On failure, return a 401 Unauthorized with a consistent error payload.
- Apply as the first middleware for any route that requires a logged-in user.

### 2. Role Middleware (`requireRole`)

- Responsibility:
  - Check `req.auth.role` against required roles (e.g. `PARENT` only for some admin-like actions).
  - Return 403 Forbidden if the user does not have a sufficient role.
- Usage examples:
  - Creating or deleting family members: `requireRole('PARENT')`.
  - Managing categories globally for the family: `requireRole('PARENT')`.
  - Basic read access or updating own assignments: allow `PARENT` and `CHILD`.

### 3. Family Scope Middleware / Helpers (`requireFamilyAccess`)

- Responsibility:
  - Ensure all database queries and mutations are scoped to `req.auth.familyId`.
  - Provide helpers or base services that always add `familyId` filters to Prisma queries.
- Examples:
  - `getEventsForFamily(req.auth.familyId, filters)`.
  - `updateTaskIfInFamily(taskId, req.auth.familyId, data)`.
- This avoids accidental cross-family access by ensuring `familyId` is always in the `where` clause.

### 4. Ownership / Relationship Checks

- For certain resources, apply additional checks beyond family scope:
  - Tasks: enforce that only `PARENT` or the task assignee(s) can update `isCompleted` or comment.
  - Events: enforce that only `PARENT` or users associated with assigned `FamilyMember` entries can modify attendance.
  - Comments: allow deletion only by the comment author or a `PARENT`.

---

## API Surface (Auth-Related Endpoints)

### `POST /auth/register`

- Purpose: Create a new user (and optionally a family if not joining an existing one).
- Input:
  - `email`, `password`, `familyName` (for first parent) or `familyCode` (for joining later, if implemented), `role` (`PARENT` or `CHILD`, but typically PARENT for first user).
- Behavior:
  - Validate input with Zod.
  - If creating a new family: create `Family`, then `User` with `familyId`.
  - Hash password and store `passwordHash`.
  - Create initial `FamilyMember` if required by UX.
  - Optionally log the user in by issuing tokens and cookies.
- Output:
  - Basic user profile (id, email, role, familyId) without `passwordHash`.

### `POST /auth/login`

- Input: `email`, `password`.
- Behavior:
  - Validate input.
  - Verify user existence and password.
  - Issue access token (JWT) and refresh token (random string stored as hash in `UserSession`).
  - Set tokens in HttpOnly cookies.
- Output:
  - User profile and optionally some basic family context.

### `POST /auth/refresh`

- Behavior:
  - Read refresh token from cookie.
  - Look up matching session by hashed token.
  - If valid and not expired, issue a new access token (and optionally rotate refresh token).
  - Update cookies accordingly.
- Output:
  - New access token (if you also send it in the response body) or just rely on the cookie.

### `POST /auth/logout`

- Behavior:
  - Read refresh token from cookie.
  - Invalidate corresponding `UserSession` record.
  - Clear access and refresh cookies.
- Output:
  - 204 No Content or a simple success message.

### `GET /auth/me`

- Behavior:
  - Requires authentication.
  - Returns current user profile and basic family info.

---

## Frontend Integration

### Login and Registration Flows

- Use dedicated React pages or dialogs under `apps/web/src/features/auth`.
- On successful login/registration:
  - Do not store tokens in localStorage; tokens are managed by HttpOnly cookies.
  - Store basic user and family info in React state (e.g. global store or React Query cache).

### Axios Configuration

- Configure Axios to **send cookies** with requests (`withCredentials: true`).
- On 401 responses:
  - Optionally attempt a silent refresh by calling `/auth/refresh`.
  - If refresh fails, redirect to login and clear client-side user state.

### Route Guards

- Implement client-side guards for protected routes (e.g. using React Router):
  - If no authenticated user in state, redirect to login.
  - Optionally show a loading state while checking `/auth/me` on first load.

> Client-side checks are for UX only; all real authorization is enforced on the backend.

---

## Data Model Impacts

- `User` (existing):
  - `id`, `email`, `passwordHash`, `role`, `familyId` are already defined in database_structure.md.
- New table (suggested) for refresh tokens/sessions (Prisma model example, not implemented yet):
  - `UserSession`
    - `id` (PK)
    - `userId` (FK → User)
    - `refreshTokenHash`
    - `createdAt`
    - `expiresAt`
    - `ipAddress` (optional)
    - `userAgent` (optional)

> Any schema changes should follow prisma.instructions.md and be implemented via migrations.

---

## Security Considerations

- **Password security:**
  - Use a modern hash function (Argon2 or bcrypt) with appropriate parameters.
  - Never log plaintext passwords or hashes.
- **Token security:**
  - Use strong secrets and rotate them when needed.
  - Keep access tokens short-lived.
  - Store tokens in HttpOnly cookies to limit XSS exposure.
- **CSRF mitigation:**
  - Use `SameSite=strict`/`lax` cookies.
  - For high-risk state-changing endpoints, consider CSRF tokens if the app is ever embedded or cross-site scenarios arise.
- **Brute-force protection:**
  - Consider rate limiting login attempts per IP and per email.
  - Optionally introduce incremental backoff on repeated failures.
- **Error messages:**
  - Avoid revealing whether an email exists in the system.
  - Use generic messages like "Invalid email or password".
- **Family isolation:**
  - Always include `familyId` from `req.auth` in Prisma `where` clauses for all family-owned resources (Event, Task, Comment, Notification, Assignments, FamilyMember).

---

## Performance Notes

- JWT verification is O(1) per request and should be fast with HS256.
- Refresh token checks require a DB lookup but are infrequent compared to normal API calls.
- Index `User.email`, `User.familyId`, and session table fields (`userId`, `expiresAt`) to keep lookups efficient.

---

## Risks and Trade-offs

- **JWT + refresh complexity:**
  - Adds a session table and refresh logic but keeps access tokens short-lived and revocable.
- **Cookie-based auth:**
  - Simplifies frontend token handling and reduces XSS risk but requires careful CSRF consideration.
- **Role model simplicity:**
  - Using only `PARENT` and `CHILD` is simple but may need expansion later (e.g. `ADMIN`). The design should keep role checks centralized to make such changes easy.

---

## Recommended Next Steps

1. Implement Prisma model and migration for `UserSession` following prisma.instructions.md.
2. Implement `auth` module in the API with routes and services described above.
3. Implement shared auth middlewares (`authenticate`, `requireRole`, family scoping helpers) and apply them across existing modules.
4. Integrate frontend auth flows (login, register, logout, refresh) and Axios configuration.
5. Add automated tests for auth routes, middlewares, and key authorization rules.
6. Add rate limiting and logging around authentication endpoints for monitoring and abuse detection.
