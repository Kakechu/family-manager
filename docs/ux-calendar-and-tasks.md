# Calendar and Task Management UX Flows

## 1. Goals and Scope

This document defines core user flows, interaction patterns, and responsive behavior for calendar events and household tasks in FamilyManager. It is intended as implementation guidance for the web app (mobile and desktop) and complements the functional and non-functional requirements in project_description.md.

In scope:
- Event creation, categorization, assignment, and filtering
- Task creation, recurrence, completion, and comments
- Loading, empty, error, and confirmation states
- Accessibility requirements for navigation and form interactions

Out of scope:
- Backend APIs, database details, and visual design specifications (exact colors, typography)

Assumed personas:
- Parent: primary organizer, can manage family members, categories, and assignments.
- Child: can see their own assignments and mark tasks as completed; limited management actions.

---

## 2. Calendar Event Flows

### 2.1 Event Creation

Entry points:
- Desktop: "Add event" button in calendar header and click/drag on a day or time slot in week/day view.
- Mobile: Floating action button (FAB) or prominent "Add" button above the calendar list view.

Event creation form (minimum fields):
- Title (text, required)
- Date and time:
  - Start date/time (required)
  - End date/time (required; default to +1 hour from start)
- Category (select from existing event categories, required; show color indicator in option)
- Assigned family members (multi-select chips or checkboxes; optional)
- Description (multiline text; optional)

Flow (happy path):
1. User opens event creation from calendar.
2. System pre-fills date/time based on selection (or current day/time if none).
3. User enters title and optionally description.
4. User selects category.
5. User assigns one or more family members.
6. User submits form.
7. System validates required fields; if valid, creates event and re-renders calendar.
8. System shows a brief success confirmation (e.g., toast) and focuses new event in the view.

Validation and errors:
- Required fields: title, start, end, category.
- End time must be after start time.
- On validation error, show inline messages near fields and keep user input.
- If network error occurs, keep form open with an error banner and a retry option.

Responsive behavior:
- Desktop: Use dialog centered over calendar or side panel that does not hide the calendar entirely.
- Mobile: Use full-screen sheet with clear "Save" and "Cancel" actions at the top or bottom.

### 2.2 Event Categorization

Category usage:
- Events must belong to exactly one category.
- Category conveys semantic meaning (School, Hobby, Doctor, etc.) and a color.

Interaction patterns:
- Category selection is via a select/dropdown with inline color swatches.
- Legend of categories and colors appears near the calendar to help interpretation.

Editing categories on events:
- User opens event details (click/tap on event card).
- User can change the category using same picker as creation.
- System updates the event and calendar color immediately on success.

Accessibility:
- Do not rely on color alone to distinguish categories; include category name in event labels and ARIA descriptions.

### 2.3 Event Assignment to Family Members

Assignment patterns:
- Multi-select of family members represented as:
  - Desktop: checkboxes or selectable chips with name and optional avatar/initials.
  - Mobile: scrollable list with checkboxes.

Flow:
1. User opens event creation or edit form.
2. User taps "Assigned to" field.
3. System shows list of family members scoped to the current family.
4. User selects one or more members.
5. System shows selected members as chips under the field.
6. On save, calendar views indicate assignment (e.g., initials on event, or filter chips active).

Edge cases:
- No family members: show an inline message and link to add a family member (if user is a parent).
- Assignment changes: show non-blocking confirmation toast when assignments update successfully.

### 2.4 Event Filtering by Family Member

Filter controls:
- Desktop: horizontal filter bar above calendar with toggle chips for each family member plus an "All" option.
- Mobile: horizontal scrollable chips or a filter button that opens a sheet with member checkboxes.

Filtering rules:
- Default view is "All" (all family members).
- When one or more members are selected, show only events assigned to at least one of those members.
- Category filters (if added later) should combine with member filters (intersection).

Interaction flow:
1. User selects one or more family member filters.
2. System updates calendar view to show only matching events.
3. Active filters are visually highlighted and announced to screen readers.
4. User can clear all filters with a single "Clear filters" action.

Accessibility:
- Filter controls must be keyboard-focusable and reachable in logical order.
- Use ARIA pressed state (e.g., aria-pressed) for toggle chips to communicate selection.

---

## 3. Task Management Flows

### 3.1 Task Creation

Entry points:
- Tasks list view: "Add task" button at top of list (desktop) or FAB (mobile).
- Optional quick-add input for simple tasks (title only) with default settings.

Task creation form (minimum fields):
- Title (required)
- Due date (optional, but recommended)
- Category (required)
- Assigned family members (multi-select; optional)
- Recurrence (see 3.2)
- Description (optional)

Flow (full form):
1. User opens "Add task".
2. User enters title and optionally description.
3. User sets due date (or leaves empty if not time-bound).
4. User selects category.
5. User assigns family members.
6. User configures recurrence (if any).
7. User submits.
8. System validates and creates the task.
9. System updates task list and shows success toast.

Quick-add flow:
1. User types title in lightweight input above the list.
2. User presses Enter or taps "Add".
3. System creates a non-recurring task with sensible defaults (e.g., no due date, uncategorized or default category) and inserts it at top of the list.

### 3.2 Task Recurrence

Recurrence options (aligned with TaskRecurrenceType):
- None
- Daily
- Weekly
- Monthly

Interaction:
- Recurrence field is a select or segmented control labeled "Repeat".
- When user selects a value other than None, display helper text describing the behavior (e.g., "Repeats every week on Monday").

High-level UX behavior (implementation detail later):
- For recurring tasks, completion on a specific occurrence should not delete the whole series; instead, it should mark that occurrence complete and schedule the next occurrence.
- Recurrence details (pattern) are visible in the task details view.

### 3.3 Task Completion

Interaction:
- Each task item displays a completion control (checkbox or toggle) at the start of the row.
- Toggling completion immediately updates visual state (strike-through title, dimmed style) and sends update to backend.

Flow:
1. User checks the completion control for a task.
2. System optimistically marks the task as completed.
3. On success, keep completed visual state and show short confirmation.
4. On failure, revert to previous state and show an error message with retry.

Filtering and sorting:
- Default: show incomplete tasks first, then completed tasks collapsed or in a separate section.
- Provide an option to hide completed tasks.

### 3.4 Task Comments

Location:
- Comments are shown in a task detail panel (desktop) or full-screen detail view (mobile) below the main fields.

Comment list:
- Each comment shows:
  - Author name (or family member name if linked)
  - Timestamp
  - Comment text

Adding a comment:
1. User opens task details.
2. User taps comment text area labeled "Add a comment".
3. User types message and submits.
4. System appends comment to the list and scrolls to it.

Error handling:
- If posting fails, show inline error near the input and preserve the comment text for retry.

Permissions (conceptual):
- Parents and children can comment on tasks they can see; deletion or editing may be restricted to authors/parents.

---

## 4. States: Loading, Empty, Error, Confirmation

### 4.1 Loading States

Calendar:
- On initial load or filter change, show skeleton placeholders for event rows or a subtle skeleton calendar grid.
- Avoid full-screen spinners that prevent orientation; skeletons keep layout stable.

Tasks:
- Show a vertical list of skeleton task rows matching final layout.

Rules:
- Loading indicators must be visible but unobtrusive.
- If loading exceeds a threshold (e.g., 5 seconds), show a helper message suggesting a retry.

### 4.2 Empty States

Calendar:
- When there are no events for selected filters, show a friendly message, e.g., "No events yet for these filters" and a primary action "Add event".

Tasks:
- When there are no tasks, show "No tasks yet" with a brief description and an "Add task" button.

General:
- Empty state visuals should not be confused with error states; avoid red or warning icons.

### 4.3 Error States

Types of errors:
- Network or server error while loading list
- Validation errors on forms
- Failure when updating or deleting an item

Patterns:
- Page-level or section-level error banner with short, clear message and a "Try again" button.
- On forms, inline errors next to fields plus an optional banner summarizing the problem.

Behaviors:
- Do not discard user input on error.
- After successful retry, clear error messages automatically.

### 4.4 Confirmation States

Destructive actions:
- Deleting an event or task requires explicit confirmation:
  - Desktop: modal dialog with clear primary (Delete) and secondary (Cancel) buttons.
  - Mobile: full-width bottom sheet or native-style dialog.

Non-destructive confirmations:
- Actions like completing a task or saving an event use lightweight confirmations (snackbars/toasts) instead of blocking dialogs.
- Snackbars include brief text and optional "Undo" for reversible actions, within a short time window.

---

## 5. Accessibility and Keyboard Navigation

### 5.1 General Principles

- All interactive elements must be reachable and operable via keyboard.
- Maintain logical tab order from top to bottom, left to right.
- Use ARIA roles and labels where native semantics are insufficient.
- Ensure sufficient color contrast and do not rely on color alone to convey meaning.

### 5.2 Calendar

Keyboard navigation:
- Allow moving focus between days or events using arrow keys when the calendar grid is focused.
- Use Enter/Space to open event details or start event creation.
- Provide skip links or landmarks to move between calendar, filters, and other sections quickly.

Screen reader support:
- Each event element announces title, time range, category, and assigned members.
- Category and assignment information is included in ARIA labels or descriptions.

### 5.3 Task Lists and Forms

Task list:
- Completion controls are standard checkboxes with accessible labels (e.g., "Mark [task title] as completed").
- Comment buttons and links are fully labeled and not represented by icon-only actions without aria-label.

Forms:
- All inputs have visible labels linked via for/id.
- Error messages are associated with fields using aria-describedby.
- Validation errors are announced when they appear (e.g., using aria-live regions for form-level errors).

Dialogs and sheets:
- On open, focus moves to the first actionable element.
- Focus is trapped within the dialog while it is open and returns to the triggering element on close.

---

## 6. Responsive Behavior (Desktop vs Mobile)

### 6.1 Calendar Views

Desktop:
- Default to month or week view with side panel for event details.
- Filters and actions (Add event, Today, navigation) are visible in a top toolbar.

Mobile:
- Default to agenda (list) view with ability to switch to a compact month view.
- Event details are shown in full-screen panels or bottom sheets.
- Actions like "Add event" use a FAB or a prominent button.

### 6.2 Task Views

Desktop:
- Two-column layout: filters and summary on the left, task list on the right.
- Task detail panel may open inline or in a side drawer.

Mobile:
- Single-column list with filter controls in a collapsible section or sheet.
- Task details open in full-screen view; back navigation returns to the list.

Shared patterns:
- Use consistent action placement (e.g., primary action bottom-right on mobile, top-right on desktop).
- Preserve context when navigating between list and detail (e.g., scroll position maintained when returning).

---

## 7. UX Risks and Assumptions

Assumptions:
- Users typically belong to a single family; multi-family membership is not supported in the initial scope.
- Time zone is determined per user or per family and applied consistently; complex cross-time-zone families are out of scope.
- Recurring task edge cases (e.g., skipping or editing single occurrences) are simplified initially; later iterations may add more granular control.

Risks:
- Overloaded calendar and task views could become cluttered for large families; careful visual hierarchy and filtering are required.
- If keyboard and screen reader support are not implemented as specified, users with assistive technologies may not be able to manage events and tasks effectively.
- If error and confirmation patterns are inconsistent across modules, the app may feel unreliable and confuse users.

Mitigations for implementation phase:
- Establish shared components for lists, dialogs, snackbars, and empty/error states.
- Add accessibility checks to development workflow (e.g., lint rules or automated checks where feasible).
- Validate flows with user testing (especially on mobile) once prototypes are available.
