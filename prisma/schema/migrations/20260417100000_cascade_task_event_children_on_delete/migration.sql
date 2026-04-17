-- Allow parent task/event rows to be deleted without violating child foreign keys.
-- This keeps task/event ownership semantics consistent with the application model.

ALTER TABLE "Comment" DROP CONSTRAINT "Comment_taskId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_taskId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_eventId_fkey";
ALTER TABLE "TaskAssignment" DROP CONSTRAINT "TaskAssignment_taskId_fkey";
ALTER TABLE "EventAssignment" DROP CONSTRAINT "EventAssignment_eventId_fkey";

ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskAssignment"
ADD CONSTRAINT "TaskAssignment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventAssignment"
ADD CONSTRAINT "EventAssignment_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
