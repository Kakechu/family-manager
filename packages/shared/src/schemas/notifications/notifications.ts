import { z } from "zod";

export const notificationTypeSchema = z.enum([
	"TASK_REMINDER",
	"EVENT_REMINDER",
	"OTHER",
]);

export const notificationSchema = z.object({
	id: z.number().int().positive(),
	message: z.string().min(1),
	type: notificationTypeSchema,
	isRead: z.boolean(),
	createdAt: z.string().datetime(),
	userId: z.number().int().positive(),
	taskId: z.number().int().positive().nullable().optional(),
	eventId: z.number().int().positive().nullable().optional(),
});

export type Notification = z.infer<typeof notificationSchema>;
