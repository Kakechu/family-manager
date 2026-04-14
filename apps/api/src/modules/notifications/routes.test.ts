import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedRequest } from "../../middleware/auth";
import notificationsRouter from "./routes";
import { runFamilyReminderScheduler } from "./reminder-scheduler";

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
