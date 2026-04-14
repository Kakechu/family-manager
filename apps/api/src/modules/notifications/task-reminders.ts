import { type Notification, notificationSchema } from "@family-manager/shared";
import type { PrismaClient } from "@prisma/client";

export interface CreateTaskDeadlineNotificationInput {
	prisma: Pick<PrismaClient, "notification">;
	userId: number;
	taskId: number;
	message: string;
}

export interface CreateEventReminderNotificationInput {
	prisma: Pick<PrismaClient, "notification">;
	userId: number;
	eventId: number;
	message: string;
}

/**
 * Creates a TASK_REMINDER notification row for a given task and user.
 *
 * This is a low-level helper intended to be called from a
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

/**
 * Creates an EVENT_REMINDER notification row for a given event and user.
 *
 * This helper mirrors createTaskDeadlineNotification and is intended to be
 * used by the reminder scheduler when an event start time is approaching.
 */
export const createEventReminderNotification = async ({
	prisma,
	userId,
	eventId,
	message,
}: CreateEventReminderNotificationInput): Promise<Notification> => {
	const created = await prisma.notification.create({
		data: {
			message,
			type: "EVENT_REMINDER",
			userId,
			eventId,
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
