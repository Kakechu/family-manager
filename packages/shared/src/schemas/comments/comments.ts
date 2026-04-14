import { z } from "zod";

export const commentSchema = z.object({
	id: z.number().int().positive(),
	text: z.string().min(1),
	createdAt: z.string().datetime(),
	taskId: z.number().int().positive(),
	userId: z.number().int().positive(),
	authorName: z.string().min(1).optional(),
});

export const createCommentSchema = z.object({
	taskId: z.number().int().positive(),
	text: z.string().min(1),
});

export type Comment = z.infer<typeof commentSchema>;
