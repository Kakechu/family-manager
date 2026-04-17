# Backend Architecture and API Contracts (MVP)

## Goal

- Define backend module boundaries and cross-cutting conventions for FamilyManager’s MVP.
- Establish API contract patterns (routes, DTOs, envelopes) for family members, events, tasks, assignments, comments, and notifications.
- Document family-level data isolation and contract compatibility rules.

## Assumptions

- Tech stack and domain entities follow docs/project_description.md and docs/database_structure.md.
- Authentication and authorization follow docs/authentication-authorization.md.
- Backend is Express + TypeScript + Prisma, organized under apps/api.
- Shared contracts and schemas live in packages/shared/src (contracts, schemas, types).

---

## Proposed Architecture

### High-Level Layout

- apps/api/src/index.ts
  - Creates the Express app, configures global middleware (JSON, CORS), mounts feature routers, and starts the HTTP server.
- apps/api/src/modules/*
  - Feature modules owning routes and service orchestration for a specific domain.
  - Modules: auth, families, family-members, events, event-categories, event-assignments, tasks, task-categories, task-assignments, comments, notifications, users.
- apps/api/src/shared/*
  - Cross-cutting utilities: database access, HTTP helpers, error types, typed request/response helpers, validation adapters.
- packages/shared/src/contracts/*
  - TypeScript DTO and API contract types shared by API, web app, and tests.
- packages/shared/src/schemas/*
  - Zod schemas for request validation and runtime parsing, aligned with contract types.

### Request Flow

1. Client sends HTTP request to REST endpoint (Axios from frontend).
2. Global middleware parses JSON, attaches correlation/context where needed.
3. Auth middleware (see docs/authentication-authorization.md) authenticates the user and adds auth context (userId, familyId, role) to the request.
4. Feature router (module) validates params and body using shared Zod schemas.
5. Module service layer executes business logic via Prisma repositories, always scoped by familyId.
6. Result is mapped into a contract DTO and sent in a consistent response envelope.
7. Errors bubble up as typed domain or validation errors, converted to a shared error envelope.

---

## Module Boundaries and Ownership

### Common Rules

- Each module exposes:
  - An Express router mounted under a stable path prefix (e.g. /api/v1/events).
  - A service layer (pure TypeScript) that contains business rules, not Express concerns.
  - Optional repository helpers for Prisma interaction (possibly shared across modules).
- Modules must not reach into each other’s internal implementation; cross-module interactions go through services or shared contracts.
- All family-specific queries and mutations must receive a familyId from auth context, not from arbitrary client input.

### Auth Module (apps/api/src/modules/auth)

- Responsibilities
  - User registration, login, logout, token refresh, and current-user profile.
  - Password hashing and verification.
  - Issuing and verifying access/refresh tokens.
- API Prefix
  - /api/v1/auth
- Contracts
  - Auth-related DTOs and Zod schemas are defined under packages/shared/src/contracts/users and packages/shared/src/schemas/users.
  - Detailed behavior is documented in docs/authentication-authorization.md.

### Families Module (apps/api/src/modules/families)

- Responsibilities
  - Reading and maintaining the current family’s metadata (name, settings).
  - Optional: creating the initial Family during registration (may be coordinated with auth service).
- API Prefix
  - /api/v1/families
- Example Endpoints
  - GET /api/v1/families/current – Fetch the authenticated user’s Family.
  - PATCH /api/v1/families/current – Update family name or settings (PARENT only).

### Family Members Module (apps/api/src/modules/family-members)

- Responsibilities
  - CRUD operations for FamilyMember entities within the authenticated family.
  - Linking FamilyMember entries to User accounts (optional userId).
- API Prefix
  - /api/v1/family-members
- Example Endpoints
  - GET /api/v1/family-members – List members of the current family.
  - POST /api/v1/family-members – Create a new family member (PARENT only).
  - PATCH /api/v1/family-members/:id – Update member details.
  - DELETE /api/v1/family-members/:id – Remove a member (soft delete rules TBD).
- Filters
  - Role filter: ?role=ADULT|CHILD.

### Events Module (apps/api/src/modules/events)

- Responsibilities
  - Creating, updating, reading, and deleting Event entities.
  - Event-level filters by time range, category, and assigned family members.
- API Prefix
  - /api/v1/events
- Example Endpoints
  - GET /api/v1/events
  - POST /api/v1/events
  - GET /api/v1/events/:id
  - PATCH /api/v1/events/:id
  - DELETE /api/v1/events/:id
- Filters
  - ?from={ISO timestamp}&to={ISO timestamp}
  - ?familyMemberId={uuid}
  - ?categoryId={uuid}
  - ?includeUnassigned=true|false

### Event Categories Module (apps/api/src/modules/event-categories)

- Responsibilities
  - Managing EventCategory values at the family scope.
  - Enforcing that reads and mutations only operate on categories owned by the authenticated user's family.
- API Prefix
  - /api/v1/event-categories

### Event Assignments Module (apps/api/src/modules/event-assignments)

- Responsibilities
  - Managing EventAssignment rows: which family members are attached to which events and their AttendanceStatus.
- API Prefix
  - /api/v1/event-assignments
- Example Endpoints
  - GET /api/v1/event-assignments?eventId={uuid}
  - POST /api/v1/event-assignments – Add one or more family members to an event.
  - PATCH /api/v1/event-assignments/:eventId/:familyMemberId – Update attendanceStatus.
  - DELETE /api/v1/event-assignments/:eventId/:familyMemberId – Remove assignment.

### Tasks Module (apps/api/src/modules/tasks)

- Responsibilities
  - CRUD for Task entities (including recurrenceType, dueDate, isCompleted).
  - Handling basic completion flows and recurrence-related rules.
- API Prefix
  - /api/v1/tasks
- Example Endpoints
  - GET /api/v1/tasks
  - POST /api/v1/tasks
  - GET /api/v1/tasks/:id
  - PATCH /api/v1/tasks/:id
  - DELETE /api/v1/tasks/:id
- Filters
  - ?familyMemberId={uuid}
  - ?categoryId={uuid}
  - ?isCompleted=true|false
  - ?dueFrom={ISO date}&dueTo={ISO date}
  - ?recurrenceType=NONE|DAILY|WEEKLY|MONTHLY

### Task Categories Module (apps/api/src/modules/task-categories)

- Responsibilities
  - Managing TaskCategory values at the family scope.
  - Enforcing that reads and mutations only operate on categories owned by the authenticated user's family.
- API Prefix
  - /api/v1/task-categories

### Task Assignments Module (apps/api/src/modules/task-assignments)

- Responsibilities
  - Managing TaskAssignment rows: mapping tasks to one or more FamilyMember entries.
- API Prefix
  - /api/v1/task-assignments
- Example Endpoints
  - GET /api/v1/task-assignments?taskId={uuid}
  - POST /api/v1/task-assignments – Assign one or more family members to a task.
  - DELETE /api/v1/task-assignments/:taskId/:familyMemberId – Remove an assignment.

### Comments Module (apps/api/src/modules/comments)

- Responsibilities
  - Managing Comment entities attached to tasks.
  - Enforcing author/role rules for editing and deleting comments.
- API Prefix
  - Prefer nested under tasks for clarity: /api/v1/tasks/:taskId/comments, with comments module owning the router implementation.
- Example Endpoints
  - GET /api/v1/tasks/:taskId/comments – List comments for a task.
  - POST /api/v1/tasks/:taskId/comments – Add a comment to a task.
  - PATCH /api/v1/tasks/:taskId/comments/:id – Edit own comment; PARENT may edit or moderate.
  - DELETE /api/v1/tasks/:taskId/comments/:id – Delete comment (author or PARENT).

### Notifications Module (apps/api/src/modules/notifications)

- Responsibilities
  - Exposing Notification entities to the authenticated user.
  - Marking notifications as read.
- API Prefix
  - /api/v1/notifications
- Example Endpoints
  - GET /api/v1/notifications – List notifications for the current user.
  - PATCH /api/v1/notifications/:id/read – Mark a single notification as read.
  - POST /api/v1/notifications/mark-all-read – Mark all as read for the current user.
- Filters
  - ?isRead=true|false
  - ?type=TASK_REMINDER|EVENT_REMINDER|OTHER

### Users Module (apps/api/src/modules/users)

- Responsibilities
  - Non-auth user operations (e.g. profile updates, preferences) separate from auth flows.
- API Prefix
  - /api/v1/users

---

## API Surface and DTO Conventions

### Base URL and Versioning

- All new API endpoints are mounted under /api/v1/.
- Version is part of the path to allow future breaking changes via /api/v2 without disrupting existing clients.

### Success Response Envelope

- Single resource:
  - 200 OK
  - Body: { "data": { ...resourceDto } }
- Collection resource (lists):
  - 200 OK
  - Body: { "data": [ ...resourceDto ], "meta": { ...paginationMeta } }
- Mutations (create/update/delete):
  - 201 Created or 200 OK, with the same envelope as single resource responses.

### Error Envelope

- All non-2xx responses follow a consistent envelope:
  - Body: { "error": { "code": string, "message": string, "details"?: unknown } }
- Conventions:
  - code is a stable, machine-readable string (e.g. "EVENT_NOT_FOUND", "VALIDATION_ERROR").
  - message is user-facing but generic enough not to leak sensitive data.
  - details is optional and used for structured validation information (e.g. field-level issues).

### Common HTTP Status Codes

- 200 OK – Successful read or update.
- 201 Created – Successful resource creation.
- 204 No Content – Successful deletion where no body is returned (optional for delete endpoints).
- 400 Bad Request – Validation errors or malformed input.
- 401 Unauthorized – Missing or invalid authentication.
- 403 Forbidden – Authenticated but not allowed (role or ownership violation).
- 404 Not Found – Resource not found within the current family scope.
- 409 Conflict – Uniqueness or state conflicts (e.g. duplicate category name in family).
- 500 Internal Server Error – Unexpected server-side failures.

### DTO Shape Principles

- DTOs are defined in packages/shared/src/contracts/* and must not expose internal database-only fields.
- Use stable field names that align with database_structure.md where appropriate:
  - id, familyId, userId, familyMemberId, categoryId, createdBy, taskId, eventId.
- Timestamps are always ISO 8601 strings in UTC.
- Enumerations use the same string values as in the database schema (e.g. PARENT, CHILD, DAILY).
- For nested relationships:
  - List endpoints may include lightweight related info (e.g. assigned member names) where useful, but heavy relations should be fetched via dedicated endpoints if needed.

### Example DTOs (Illustrative)

- Event DTO (read):
  - { id, title, description?, startTime, endTime, categoryId, familyId, createdBy, createdAt, updatedAt? }
- Task DTO (read):
  - { id, title, description?, dueDate?, isCompleted, recurrenceType, categoryId, familyId, createdBy, createdAt, updatedAt? }
- Comment DTO (read):
  - { id, text, taskId, userId, createdAt }
- Notification DTO (read):
  - { id, userId, taskId?, eventId?, message, type, isRead, createdAt }

Concrete DTOs will be codified in packages/shared/src/contracts as TypeScript types and kept in sync with Zod schemas in packages/shared/src/schemas.

---

## Family-Level Data Isolation Strategy

- Every family-specific entity includes a familyId column (see docs/database_structure.md).
- Auth middleware resolves the current user and their familyId from the access token; this value is attached to the request context (e.g. req.auth.familyId).
- All repository and service methods that operate on Family, FamilyMember, Event, Task, Comment, Notification, TaskAssignment, and EventAssignment must:
  - Accept familyId as an explicit parameter.
  - Include familyId in the Prisma where clause for every query and mutation that targets these entities.
- API requests must not accept arbitrary familyId values from the client; the server derives family scope exclusively from auth context.
- Not-found errors are reported as 404 Not Found when a resource with the given id does not exist within the caller’s familyId, avoiding leakage of cross-family existence.
- Future multi-family or admin scenarios can introduce separate, explicit admin endpoints with their own authorization rules, keeping the default endpoints strictly family-scoped.

---

## Pagination and Filtering Conventions

### Pagination

- All list endpoints (events, tasks, comments, notifications, categories, assignments) support page-based pagination.
- Request query parameters:
  - page: 1-based page index (default: 1).
  - pageSize: number of items per page (default: 20, maximum: 100).
- Response meta:
  - { "page": number, "pageSize": number, "totalItems": number, "totalPages": number }

### Filtering

- Filters are expressed as simple query parameters with stable names; examples:
  - Events: from, to, familyMemberId, categoryId, includeUnassigned.
  - Tasks: familyMemberId, categoryId, isCompleted, dueFrom, dueTo, recurrenceType.
  - Notifications: isRead, type.
  - Family members: role.
- Filters are always applied within the current family scope; there is no way to filter across families.
- When combining pagination and filtering, meta.totalItems and meta.totalPages reflect the filtered result set only.

---

## Contract Compatibility Rules

- Shared contracts are the single source of truth for API DTOs:
  - packages/shared/src/contracts defines request and response types per route.
  - packages/shared/src/schemas defines Zod schemas that mirror those types.
  - apps/api and apps/web import from packages/shared to avoid drift.
- Backward compatibility principles:
  - Adding optional fields to DTOs is allowed without version bump.
  - Changing the meaning or type of existing fields, or removing fields, is considered a breaking change.
  - Breaking changes must only be introduced under a new versioned path (e.g. /api/v2/...).
- Error codes (error.code) are considered part of the contract for automated clients; avoid renaming or removing codes without coordination.
- For list endpoints, pagination field names (page, pageSize, totalItems, totalPages) are stable and shared across modules.

---

## Security and Performance Notes

- Security
  - All endpoints for family-specific data require authentication and family scoping as described above.
  - Authorization rules (PARENT vs CHILD; ownership) live in module services and/or dedicated middlewares.
  - Validation must occur at the API boundary using Zod schemas to prevent invalid or unsafe input from reaching business logic.
- Performance
  - List endpoints must use pagination by default to avoid unbounded result sets.
  - Indexing on familyId and common filter columns (dueDate, startTime, isCompleted) is recommended at the database level.

---

## Risks and Trade-Offs

- Page-based pagination is simpler but less efficient for very large datasets or highly dynamic lists; cursor-based pagination may be considered later if needed.
- Using a uniform response envelope (data + meta / error) adds a small overhead but simplifies frontend and test code via shared helpers.
- Nested comment routes under tasks improve clarity but require careful router wiring; alternatively, a flat /comments endpoint could be added later if cross-task queries are needed.
- Versioning via path (/api/v1) commits us to maintaining old versions if /api/v2 is introduced; this is acceptable for an MVP but should be documented in product planning.

---

## Recommended Next Steps

- Define concrete TypeScript contract types and Zod schemas in packages/shared/src/contracts and packages/shared/src/schemas for each module based on these conventions.
- Scaffold Express routers in apps/api/src/modules/* using the prefixes and envelopes defined here.
- Implement consistent error handling middleware that converts domain and validation errors into the shared error envelope.
- Add high-level tests (e.g. in tests/api or tests/integration) to verify envelope, pagination, filtering, and family isolation behavior across representative endpoints.
