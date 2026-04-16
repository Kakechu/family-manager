import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Notification } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { runFamilyReminderScheduler } from "./reminder-scheduler";
import notificationsRouter from "./routes";

vi.mock("../../middleware/auth", () => {
	return {
		authenticate: (
			req: AuthenticatedRequest,
			_res: Response,
			next: NextFunction,
		): void => {
			// Attach a fake auth context for a parent in family 10
			req.auth = { userId: 1, familyId: 10, role: "PARENT" };
			next();
		},
		requireRole:
			() =>
			(
				_req: AuthenticatedRequest,
				_res: Response,
				next: NextFunction,
			): void => {
				next();
			},
	};
});

const prismaMock = vi.hoisted(() => ({
	notification: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
	},
}));

vi.mock("../../shared/db/client", () => {
	return {
		prisma: prismaMock,
	};
});

vi.mock("./reminder-scheduler", () => {
	return {
		runFamilyReminderScheduler: vi.fn(),
	};
});

const buildApp = () => {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());
	app.use("/api/v1/notifications", notificationsRouter);
	return app;
};

describe("notifications routes - reminder scheduler", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("runs the family reminder scheduler and returns created counts", async () => {
		(
			runFamilyReminderScheduler as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			createdTaskNotifications: 2,
			createdEventNotifications: 1,
		});

		const app = buildApp();

		const response = await request(app).post(
			"/api/v1/notifications/reminders/run",
		);

		expect(response.status).toBe(200);

		// Ensure the scheduler was invoked for the authenticated family
		expect(runFamilyReminderScheduler).toHaveBeenCalledWith(
			expect.objectContaining({
				familyId: 10,
			}),
		);

		expect(response.body.data).toEqual({
			createdTaskNotifications: 2,
			createdEventNotifications: 1,
		});
	});
});

describe("notifications routes - inbox and read state", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists notifications for the authenticated user in descending order", async () => {
		(
			prismaMock.notification.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 2,
				message: "Evening event reminder",
				type: "EVENT_REMINDER",
				isRead: true,
				createdAt: new Date("2026-04-16T18:00:00.000Z"),
				userId: 1,
				taskId: null,
				eventId: 22,
			},
			{
				id: 1,
				message: "Morning task reminder",
				type: "TASK_REMINDER",
				isRead: false,
				createdAt: new Date("2026-04-16T08:00:00.000Z"),
				userId: 1,
				taskId: 11,
				eventId: null,
			},
		]);

		const app = buildApp();

		const response = await request(app).get("/api/v1/notifications");

		expect(response.status).toBe(200);
		const body = response.body as { data: Notification[] };
		expect(body.data).toHaveLength(2);
		expect(body.data[0].id).toBe(2);
		expect(body.data[1].id).toBe(1);
		expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: 1 },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			}),
		);
	});

	it("marks a notification as read for the authenticated user", async () => {
		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 3, userId: 1 });
		(
			prismaMock.notification.update as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 3,
			message: "Task reminder",
			type: "TASK_REMINDER",
			isRead: true,
			createdAt: new Date("2026-04-16T08:00:00.000Z"),
			userId: 1,
			taskId: 11,
			eventId: null,
		});

		const app = buildApp();

		const response = await request(app).patch("/api/v1/notifications/3/read");

		expect(response.status).toBe(200);
		expect(response.body.data.isRead).toBe(true);
		expect(prismaMock.notification.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 3 },
				data: { isRead: true },
			}),
		);
	});

	it("returns 404 when a notification does not belong to the authenticated user", async () => {
		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).patch("/api/v1/notifications/99/read");

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("NOTIFICATION_NOT_FOUND");
	});

	it("marks all unread notifications as read", async () => {
		(
			prismaMock.notification.updateMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ count: 2 });

		const app = buildApp();

		const response = await request(app).post(
			"/api/v1/notifications/mark-all-read",
		);

		expect(response.status).toBe(200);
		expect(response.body.data.updatedCount).toBe(2);
		expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					userId: 1,
					isRead: false,
				},
				data: { isRead: true },
			}),
		);
	});
});
