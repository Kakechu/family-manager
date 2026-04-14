import { z } from "zod";

export const taskCategorySchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	color: z.string().min(1).nullable().optional(),
});

export const createTaskCategorySchema = taskCategorySchema.omit({
	id: true,
});

export const updateTaskCategorySchema = createTaskCategorySchema.partial();

export type TaskCategory = z.infer<typeof taskCategorySchema>;
