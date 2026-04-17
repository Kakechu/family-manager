import {
	type Notification,
	notificationSchema,
	paginationQuerySchema,
} from "@family-manager/shared";
import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
	type AuthenticatedRequest,
	authenticate,
	requireRole,
} from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { asyncHandler } from "../../shared/http/error-handler";
import { buildPaginationMeta, getPaginationArgs } from "../../shared/http/pagination";
import { sendData, sendError, sendList } from "../../shared/http/responses";
import { runFamilyReminderScheduler } from "./reminder-scheduler";

const router = Router();

const notificationQuerySchema = paginationQuerySchema.extend({
	isRead: z.enum(["true", "false"]).optional(),
	type: z.enum(["TASK_REMINDER", "EVENT_REMINDER", "OTHER"]).optional(),
});

const toNotificationDto = (notification: {
	id: number;
	message: string;
	type: Notification["type"];
	isRead: boolean;
	createdAt: Date;
	userId: number;
	taskId: number | null;
	eventId: number | null;
}): Notification => {
	return notificationSchema.parse({
		id: notification.id,
		message: notification.message,
		type: notification.type,
		isRead: notification.isRead,
		createdAt: notification.createdAt.toISOString(),
		userId: notification.userId,
		taskId: notification.taskId,
		eventId: notification.eventId,
	});
};

router.use(authenticate);

router.get(
	"/",
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsedQuery = notificationQuerySchema.safeParse(req.query);

		if (!parsedQuery.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid notification query parameters",
				parsedQuery.error.flatten(),
			);
			return;
		}

		const { page, pageSize } = parsedQuery.data;
		const notificationsWhere = {
			userId: req.auth.userId,
			...(parsedQuery.data.isRead
				? { isRead: parsedQuery.data.isRead === "true" }
				: {}),
			...(parsedQuery.data.type ? { type: parsedQuery.data.type } : {}),
		};

		const totalItems = await prisma.notification.count({
			where: notificationsWhere,
		});
		const notifications = await prisma.notification.findMany({
			where: notificationsWhere,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			...getPaginationArgs({ page, pageSize }),
		});

		sendList(
			res,
			200,
			notifications.map(toNotificationDto),
			buildPaginationMeta({ page, pageSize, totalItems }),
		);
	}),
);

router.patch(
	"/:id/read",
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid notification id");
			return;
		}

		const existing = await prisma.notification.findFirst({
			where: {
				id,
				userId: req.auth.userId,
			},
		});

		if (!existing) {
			sendError(res, 404, "NOTIFICATION_NOT_FOUND", "Notification not found");
			return;
		}

		const updated = await prisma.notification.update({
			where: {
				id,
			},
			data: {
				isRead: true,
			},
		});

		sendData(res, 200, toNotificationDto(updated));
	}),
);

router.post(
	"/mark-all-read",
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const result = await prisma.notification.updateMany({
			where: {
				userId: req.auth.userId,
				isRead: false,
			},
			data: {
				isRead: true,
			},
		});

		sendData(res, 200, { updatedCount: result.count });
	}),
);

router.post(
	"/reminders/run",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const result = await runFamilyReminderScheduler({
			prisma,
			familyId: req.auth.familyId,
		});

		// Basic observability hook for reminder runs.
		// eslint-disable-next-line no-console
		console.info("reminder_scheduler_run", {
			familyId: req.auth.familyId,
			createdTaskNotifications: result.createdTaskNotifications,
			createdEventNotifications: result.createdEventNotifications,
		});

		sendData(res, 200, result);
	}),
);

export default router;
