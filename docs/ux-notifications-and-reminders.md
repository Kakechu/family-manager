# Notifications and Reminders UX

## 1. Goals and Scope

This document defines how reminders and notifications are surfaced in the FamilyManager web app on mobile and desktop. It focuses on in-app notification and reminder UX for events and tasks, and complements the scheduling and data model design in notification-scheduling-and-reminders.md.

In scope:
- UX patterns for viewing and clearing event and task reminders
- In-context indicators for upcoming and overdue items in calendar and task views
- Navigation patterns for reaching notifications from global UI
- Accessibility guidance for announcements and focus management

Out of scope:
- Detailed visual design for external channels (email, SMS, push)
- Low-level backend implementation details

Personas:
- Parent: sees all family notifications, manages preferences, and clears notifications.
- Child: sees notifications relevant to their own assignments and can clear their own reminders.

---

## 2. Notification Entry Points and Global Navigation

### 2.1 Global Notification Access

- Place a notification icon in the main app chrome:
  - Desktop: in the top-right app bar with a badge for unread count.
  - Mobile: in the top app bar or bottom navigation bar, depending on final layout.
- The icon uses a standard bell glyph with the following behavior:
  - No badge when there are 0 unread notifications.
  - A numeric badge for 1–9 unread notifications ("1"–"9").
  - A capped badge for 10+ unread notifications ("9+").
- Clicking or tapping the icon opens the notification list (see section 3).

### 2.2 Notification Types

Notifications surfaced in the UI fall into these primary categories:
- Event reminders (upcoming or recently overdue events)
- Task reminders (upcoming due dates or overdue tasks)
- Task comment mentions or updates (future enhancement)

The UI should clearly label the type in each notification item (e.g., "Event reminder", "Task reminder").

---

## 3. Notification List / Inbox Pattern

### 3.1 Layout

- Use a panel or page that lists notifications in reverse chronological order (newest first).
- Desktop:
  - Option A: right-side drawer that overlays existing content but keeps context visible.
  - Option B: full-width page for smaller desktop widths.
- Mobile:
  - Use a full-screen view accessible from the notification icon.

Each notification row includes:
- Title (derived from event or task title)
- Short description or context line (e.g., "Starts in 30 minutes", "Due yesterday")
- Timestamp (relative, e.g., "5 min ago", with accessible full date in tooltip/ARIA label)
- Resource type and target (e.g., "Event • Alex", "Task • Whole family")
- Status indicator (unread vs read)
- Primary action affordance, typically tapping the row to open the related event/task detail.

### 3.2 Unread vs Read States

- Unread notifications:
  - Bold title.
  - Subtle background highlight.
  - Badge or dot indicator on the left edge for screen-reader-friendly labeling (e.g., "Unread notification").
- Read notifications:
  - Normal text weight.
  - Default background.
- Users can mark notifications as read through:
  - Automatic marking when the user opens the linked event/task detail page.
  - Manual marking via a context menu or swipe action (mobile) labeled "Mark as read".

### 3.3 Clearing Notifications

- Per-notification actions:
  - "Clear" or "Dismiss" action from a context menu or swipe action.
  - Clearing removes the notification from the list or moves it to a separate "Cleared" section (MVP can simply remove it).
- Bulk actions:
  - Provide a "Mark all as read" action at the top of the list.
  - Optionally, a "Clear all" action for non-critical reminders; this should confirm before irreversible bulk deletion.

Confirmation patterns:
- Use snackbars/toasts for non-destructive changes (mark as read).
- Use confirmation dialogs for bulk clears.

---

## 4. In-Context Reminder Indicators

### 4.1 Calendar Views (Events)

In month/week/day calendar views and event lists:

- Upcoming reminder indicator:
  - Use a small badge or icon on the event card when a reminder is scheduled within a short window (e.g., within the next 24 hours).
  - Suggested text: "Reminder set" or a clock icon with accessible label "Reminder scheduled".
- Overdue indicator:
  - If an event has started or finished and a reminder has fired but no action was taken, mark it as "Missed" or "Past".
  - Visual treatment: subtle red/orange accent and a label like "Missed".

Event detail panel/view:
- Show a dedicated "Reminders" section summarizing:
  - Whether a reminder was scheduled.
  - When the reminder is/was scheduled relative to the event start (e.g., "Reminds 1 hour before start").
  - Any past-due reminder state (e.g., "Reminder sent 5 minutes ago").

### 4.2 Task List and Detail Views

Task list rows should communicate reminder and due state:

- Upcoming tasks:
  - Tasks due within the next 24 hours show a subtle "Due soon" chip near the title.
  - Color: warning/attention tone that is accessible but not alarming.
- Overdue tasks:
  - Tasks with due dates in the past show an "Overdue" chip and may highlight the date in a contrasting color.
- No due date:
  - Do not show reminder chips; rely on basic task presence in the list.

Task detail views include a "Reminders" section similar to events:
- Show whether reminders are enabled for this task.
- Show the next scheduled reminder time (e.g., "Tomorrow at 17:00").
- For recurring tasks, note that reminders repeat (e.g., "Daily at 20:00").

### 4.3 Combined Filter and Sort Behavior

- Calendar and task views should avoid surprising jumps when reminders change state.
- Recommendation:
  - Sort tasks primarily by completion and due date, then by title.
  - Do not sort solely by reminder time; indicators augment, not control, the primary ordering.

---

## 5. Mobile vs Desktop Behavior

### 5.1 Desktop

- Show more context in notifications list (longer titles, more text on one line).
- Use drawers or side panels to avoid fully losing the current context when opening notifications.
- Keyboard interactions:
  - Tab order enters the notification icon after main navigation.
  - Arrow keys can move between list items; Enter/Space activates the selected notification.

### 5.2 Mobile

- Use a dedicated notifications screen to keep content readable.
- Support swipe gestures on list items for quick actions:
  - Swipe right: mark as read/unread.
  - Swipe left: clear/dismiss (with undo via snackbar).
- Ensure the back navigation (system and app-level) consistently returns to the previous context (e.g., calendar or tasks list).

---

## 6. Accessibility and Announcements

### 6.1 Live Regions and Announcements

- Use a polite ARIA live region for new notifications that arrive while the user is on the page.
  - Example message: "New task reminder: Take out recycling, due in 1 hour.".
- Avoid interrupting current focus when a new notification arrives; announcement should be screen-reader-only.

### 6.2 Focus Management

- When opening the notification list:
  - Move focus to the list container heading (e.g., "Notifications") so users understand context.
  - Keep the previously focused element in memory to restore focus when closing.
- After clearing or marking a notification as read:
  - Keep focus on the next logical item in the list.
  - If the last item is cleared, move focus back to the list heading or the close button.

### 6.3 Keyboard and Screen Reader Support

- All actions must be achievable via keyboard only:
  - Open notifications via keyboard shortcut or tabbing to the icon.
  - Navigate between notifications using arrow keys.
  - Activate actions (open, mark as read, clear) with Enter/Space.
- Ensure each notification item has:
  - An accessible name including title and type (e.g., "Event reminder, Parent-teacher meeting, starts in 1 hour").
  - Role consistent with a list item.

---

## 7. Preference Affordances (MVP Level)

MVP supports simple, inline preference controls rather than a full notification center.

- Per-notification opt-out:
  - Provide a "Mute similar reminders" or "Turn off reminders for this task/event" action in the notification context menu.
  - This action should clearly describe the effect (e.g., "Stop future reminders for this task; existing notifications remain.").
- Global inline link:
  - In the notification list footer, include a link "Manage notification settings" that navigates to a future settings page (can initially be a stub).

Preference changes should confirm with a brief message (e.g., "Reminders turned off for this task").

---

## 8. Open Assumptions and Future Enhancements

### 8.1 Assumptions

- In-app notifications are the primary delivery channel for MVP; email/SMS/push may be added later using the same Notification model.
- The backend provides enough metadata in Notification payloads to render type, target (event/task), due/occurrence time, and read/unread status.
- Family-level visibility rules are enforced server-side; the UI only receives notifications the user is allowed to see.

### 8.2 Future Enhancements

- Dedicated notification settings page with per-channel and per-category preferences.
- Richer notification types (e.g., summary digests, weekly overviews).
- Visual theming for high-priority vs low-priority reminders.
- Advanced filtering (e.g., show only overdue, show only tasks, show only events).

These enhancements should build on the patterns defined here without breaking existing behavior.

## 9. Manual Acceptance and Exploratory Checklist (Issue 79)

This checklist provides release evidence expectations for notification UX behavior on desktop and mobile. Scenario IDs align with requirement-traceability-and-acceptance-matrix.md.

### 9.1 UX-004 - Desktop notifications list access + read-state updates

- Requirements: FR10, FR11, NFR2, NFR6
- Preconditions:
  - User is authenticated.
  - At least one unread event reminder and one unread task reminder are available.
- Checks:
  - Open notifications from the desktop app bar icon and confirm unread badge is visible.
  - Open one notification target and return to the list.
  - Manually mark another notification as read.
  - Clear one notification.
- Expected:
  - Read-state updates are reflected in both row style and badge count.
  - Opening a notification target behaves consistently with the selected read-state policy.
  - Clear action updates the list without focus loss or navigation dead-end.
- Release evidence:
  - One short desktop screen recording for the full flow.
  - One screenshot showing unread vs read visual state.

### 9.2 UX-005 - Mobile notifications list access + read-state updates

- Requirements: FR10, FR11, NFR2, NFR6
- Preconditions:
  - User is authenticated on a mobile viewport/device.
  - Multiple unread notifications are available.
- Checks:
  - Open notification screen from mobile navigation.
  - Mark one item as read with supported action (swipe or tap).
  - Clear one item and verify undo behavior when present.
  - Leave screen and re-open list.
- Expected:
  - Read-state persists across navigation.
  - Badge count updates after read, clear, and undo transitions.
  - Rows remain readable and tappable at mobile sizes.
- Release evidence:
  - One short mobile recording of list access and state transitions.

### 9.3 UX-006 - Accessibility checks (keyboard + screen reader semantics)

- Requirements: FR10, FR11, NFR6
- Preconditions:
  - Desktop browser with keyboard-only navigation and a screen reader enabled.
- Checks:
  - Open notification list without mouse.
  - Move through list items and actions with keyboard only.
  - Trigger mark-as-read and clear actions.
  - Verify announcement text for notification type and read/unread status.
- Expected:
  - Focus order is logical and visible at all times.
  - Notification rows and actions expose clear accessible names.
  - Read-state semantics are announced consistently when changed.
- Release evidence:
  - Keyboard walkthrough recording.
  - Screen-reader notes or transcript snippet captured by QA.

### 9.4 Blocking gaps and follow-up

- Blocker: If read-state fields are missing or unstable in notification payloads, UX-004 and UX-005 cannot be validated for release.
- Follow-up: Add stable QA fixture data for mixed read/unread task and event reminders to reduce manual setup time.
