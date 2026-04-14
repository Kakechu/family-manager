import { describe, expect, it } from "vitest";
import { createTaskSchema, taskRecurrenceTypeSchema } from "./tasks";

describe("task schemas", () => {
	it("accepts a valid create task payload", () => {
		const result = createTaskSchema.safeParse({
			title: "Do the dishes",
			categoryId: 1,
			recurrenceType: "NONE",
		});

		expect(result.success).toBe(true);
	});

	it("rejects an invalid recurrence type", () => {
		const result = taskRecurrenceTypeSchema.safeParse("YEARLY");

		expect(result.success).toBe(false);
	});

	it("allows an optional UTC due date string", () => {
		const result = createTaskSchema.safeParse({
			title: "Vacuum living room",
			categoryId: 2,
			recurrenceType: "DAILY",
			dueDate: "2026-04-14T10:00:00.000Z",
		});

		expect(result.success).toBe(true);
	});
});
