import { type Notification, notificationSchema } from "@family-manager/shared";
import type { PrismaClient } from "@prisma/client";

export interface CreateTaskDeadlineNotificationInput {
	prisma: Pick<PrismaClient, "notification">;
	userId: number;
	taskId: number;
	message: string;
}

/**
 * Creates a TASK_REMINDER notification row for a given task and user.
 *
 * This is a low-level helper intended to be called from a future
 * reminder scheduler or background job when a task deadline is approaching.
 */
export const createTaskDeadlineNotification = async ({
	prisma,
	userId,
	taskId,
	message,
}: CreateTaskDeadlineNotificationInput): Promise<Notification> => {
	const created = await prisma.notification.create({
		data: {
			message,
			type: "TASK_REMINDER",
			userId,
			taskId,
		},
	});

	return notificationSchema.parse({
		id: created.id,
		message: created.message,
		type: created.type,
		isRead: created.isRead,
		createdAt: created.createdAt.toISOString(),
		userId: created.userId,
		taskId: created.taskId,
		eventId: created.eventId,
	});
};
