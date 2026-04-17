-- Enforce family-scoped ownership for event and task categories.
-- Backfill existing rows by deriving ownership from linked events/tasks.

ALTER TABLE "EventCategory"
ADD COLUMN "familyId" INTEGER;

ALTER TABLE "TaskCategory"
ADD COLUMN "familyId" INTEGER;

-- Assign one owning family to categories already referenced by events/tasks.
WITH event_usage AS (
	SELECT e."categoryId" AS category_id, MIN(e."familyId") AS family_id
	FROM "Event" e
	GROUP BY e."categoryId"
)
UPDATE "EventCategory" ec
SET "familyId" = event_usage.family_id
FROM event_usage
WHERE ec."id" = event_usage.category_id;

WITH task_usage AS (
	SELECT t."categoryId" AS category_id, MIN(t."familyId") AS family_id
	FROM "Task" t
	GROUP BY t."categoryId"
)
UPDATE "TaskCategory" tc
SET "familyId" = task_usage.family_id
FROM task_usage
WHERE tc."id" = task_usage.category_id;

-- If an old category is shared by multiple families, duplicate it and remap child rows
-- so each family points at its own owned category row.
DO $$
DECLARE
	event_share RECORD;
	task_share RECORD;
	new_event_category_id INTEGER;
	new_task_category_id INTEGER;
BEGIN
	FOR event_share IN
		SELECT event_family.source_category_id, event_family.family_id
		FROM (
			SELECT e."categoryId" AS source_category_id, e."familyId" AS family_id
			FROM "Event" e
			GROUP BY e."categoryId", e."familyId"
		) event_family
		INNER JOIN (
			SELECT e."categoryId" AS source_category_id, MIN(e."familyId") AS owner_family_id
			FROM "Event" e
			GROUP BY e."categoryId"
		) event_owner
			ON event_owner.source_category_id = event_family.source_category_id
		WHERE event_family.family_id <> event_owner.owner_family_id
	LOOP
		INSERT INTO "EventCategory" ("name", "color", "familyId")
		SELECT ec."name", ec."color", event_share.family_id
		FROM "EventCategory" ec
		WHERE ec."id" = event_share.source_category_id
		RETURNING "id" INTO new_event_category_id;

		UPDATE "Event"
		SET "categoryId" = new_event_category_id
		WHERE "categoryId" = event_share.source_category_id
		  AND "familyId" = event_share.family_id;
	END LOOP;

	FOR task_share IN
		SELECT task_family.source_category_id, task_family.family_id
		FROM (
			SELECT t."categoryId" AS source_category_id, t."familyId" AS family_id
			FROM "Task" t
			GROUP BY t."categoryId", t."familyId"
		) task_family
		INNER JOIN (
			SELECT t."categoryId" AS source_category_id, MIN(t."familyId") AS owner_family_id
			FROM "Task" t
			GROUP BY t."categoryId"
		) task_owner
			ON task_owner.source_category_id = task_family.source_category_id
		WHERE task_family.family_id <> task_owner.owner_family_id
	LOOP
		INSERT INTO "TaskCategory" ("name", "color", "familyId")
		SELECT tc."name", tc."color", task_share.family_id
		FROM "TaskCategory" tc
		WHERE tc."id" = task_share.source_category_id
		RETURNING "id" INTO new_task_category_id;

		UPDATE "Task"
		SET "categoryId" = new_task_category_id
		WHERE "categoryId" = task_share.source_category_id
		  AND "familyId" = task_share.family_id;
	END LOOP;
END $$;

-- Assign ownership for orphaned categories; if no families exist, drop orphan rows.
UPDATE "EventCategory"
SET "familyId" = (
	SELECT f."id"
	FROM "Family" f
	ORDER BY f."id" ASC
	LIMIT 1
)
WHERE "familyId" IS NULL;

UPDATE "TaskCategory"
SET "familyId" = (
	SELECT f."id"
	FROM "Family" f
	ORDER BY f."id" ASC
	LIMIT 1
)
WHERE "familyId" IS NULL;

DELETE FROM "EventCategory"
WHERE "familyId" IS NULL;

DELETE FROM "TaskCategory"
WHERE "familyId" IS NULL;

ALTER TABLE "EventCategory"
ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "TaskCategory"
ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "EventCategory"
ADD CONSTRAINT "EventCategory_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskCategory"
ADD CONSTRAINT "TaskCategory_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "EventCategory_familyId_idx"
ON "EventCategory"("familyId");

CREATE INDEX "TaskCategory_familyId_idx"
ON "TaskCategory"("familyId");
