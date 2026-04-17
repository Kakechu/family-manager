-- Add stable reminder idempotency key to notifications
-- Nullable for compatibility with existing records and non-reminder notifications

ALTER TABLE "Notification"
ADD COLUMN "reminderKey" TEXT;

CREATE UNIQUE INDEX "Notification_reminderKey_key"
ON "Notification"("reminderKey");
