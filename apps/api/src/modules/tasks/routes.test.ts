import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import tasksRouter from "./routes";

vi.mock("../../middleware/auth", () => {
	return {
		authenticate: (
			req: AuthenticatedRequest,
			_res: Response,
			next: NextFunction,
		): void => {
			// Attach a fake auth context
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
	task: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("../../shared/db/client", () => {
	return {
		prisma: prismaMock,
	};
});

const buildApp = () => {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());
	app.use("/api/v1/tasks", tasksRouter);
	return app;
};

describe("tasks routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists tasks filtered by family member and completion", async () => {
		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				title: "Do dishes",
				description: null,
				// stored as Date in UTC
				dueDate: new Date("2026-04-15T10:00:00.000Z"),
				isCompleted: false,
				recurrenceType: "NONE",
				categoryId: 1,
				createdBy: 1,
				familyId: 10,
			},
		]);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/tasks")
			.query({ familyMemberId: 100, isCompleted: true });

		expect(response.status).toBe(200);
		const body = response.body as { data: Task[] };
		expect(body.data).toHaveLength(1);

		expect(prismaMock.task.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					familyId: 10,
					assignments: { some: { familyMemberId: 100 } },
				}),
				orderBy: [{ dueDate: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("returns 400 for invalid task list query parameters", async () => {
		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/tasks")
			.query({ familyMemberId: "not-a-number" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		// No DB query should be made when validation fails
		expect(prismaMock.task.findMany).not.toHaveBeenCalled();
	});

	it("creates a non-recurring task with no due date", async () => {
		(
			prismaMock.task.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			title: "Take out trash",
			description: null,
			dueDate: null,
			isCompleted: false,
			recurrenceType: "NONE",
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/tasks").send({
			title: "Take out trash",
			recurrenceType: "NONE",
			categoryId: 1,
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: Task };
		expect(body.data.id).toBe(1);
		expect(body.data.familyId).toBe(10);
		expect(body.data.dueDate).toBeNull();
		// isCompleted should default to false on creation
		expect(body.data.isCompleted).toBe(false);
	});

	it("rejects recurring task without due date", async () => {
		const app = buildApp();

		const response = await request(app).post("/api/v1/tasks").send({
			title: "Weekly chore",
			recurrenceType: "WEEKLY",
			categoryId: 1,
		});

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		expect(response.body.error.message).toBe(
			"Recurring tasks must have a due date",
		);
	});

	it("returns 404 when fetching a task that does not belong to the family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).get("/api/v1/tasks/123");

		expect(response.status).toBe(404);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("TASK_NOT_FOUND");
	});
});
