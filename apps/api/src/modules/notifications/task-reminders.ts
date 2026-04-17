import { type Notification, notificationSchema } from "@family-manager/shared";
import type { PrismaClient } from "@prisma/client";

export interface CreateTaskDeadlineNotificationInput {
	prisma: Pick<PrismaClient, "notification">;
	userId: number;
	taskId: number;
	reminderKey: string;
	message: string;
}

export interface CreateEventReminderNotificationInput {
	prisma: Pick<PrismaClient, "notification">;
	userId: number;
	eventId: number;
	reminderKey: string;
	message: string;
}

const isUniqueConstraintError = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	const maybeCode = (error as { code?: unknown }).code;
	return maybeCode === "P2002";
};

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
	reminderKey,
	message,
}: CreateTaskDeadlineNotificationInput): Promise<Notification | null> => {
	try {
		const created = await prisma.notification.create({
			data: {
				message,
				type: "TASK_REMINDER",
				userId,
				taskId,
				reminderKey,
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
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return null;
		}

		throw error;
	}
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
	reminderKey,
	message,
}: CreateEventReminderNotificationInput): Promise<Notification | null> => {
	try {
		const created = await prisma.notification.create({
			data: {
				message,
				type: "EVENT_REMINDER",
				userId,
				eventId,
				reminderKey,
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
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return null;
		}

		throw error;
	}
};
