-- Relax NOT NULL constraints for optional Task/Event fields
-- Related to issue #60 (Align Task and Event optional fields with UX)

ALTER TABLE "Event" ALTER COLUMN "description" DROP NOT NULL;

ALTER TABLE "Task" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "dueDate" DROP NOT NULL;
