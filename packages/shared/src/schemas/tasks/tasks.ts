import { z } from "zod";

export const taskRecurrenceTypeSchema = z.enum([
	"NONE",
	"DAILY",
	"WEEKLY",
	"MONTHLY",
]);

export const taskSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1),
	description: z.string().min(1).nullable().optional(),
	// Stored in UTC, serialized as ISO-8601 string; may be null when unset
	dueDate: z.string().datetime().nullable().optional(),
	isCompleted: z.boolean(),
	recurrenceType: taskRecurrenceTypeSchema,
	categoryId: z.number().int().positive(),
	createdBy: z.number().int().positive(),
	familyId: z.number().int().positive(),
});

export const createTaskSchema = taskSchema.omit({
	id: true,
	isCompleted: true,
	createdBy: true,
	familyId: true,
});

export const updateTaskSchema = createTaskSchema
	.extend({
		isCompleted: z.boolean().optional(),
	})
	.partial();

export type Task = z.infer<typeof taskSchema>;
