import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskAssignment } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { apiErrorHandler } from "../../shared/http/error-handler";
import taskAssignmentsRouter from "./routes";

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
		findFirst: vi.fn(),
	},
	taskAssignment: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
		upsert: vi.fn(),
		delete: vi.fn(),
	},
	familyMember: {
		findMany: vi.fn(),
	},
	$transaction: vi.fn(),
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
	app.use("/api/v1/task-assignments", taskAssignmentsRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("task assignments routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists assignments for a task in the same family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.taskAssignment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([{ taskId: 1, familyMemberId: 100 }]);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/task-assignments")
			.query({ taskId: 1 });

		expect(response.status).toBe(200);
		const body = response.body as { data: TaskAssignment[] };
		expect(body.data).toHaveLength(1);
		expect(body.data[0].taskId).toBe(1);
		expect(body.data[0].familyMemberId).toBe(100);
	});

	it("returns 404 when listing assignments for a task outside the family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/task-assignments")
			.query({ taskId: 999 });

		expect(response.status).toBe(404);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("TASK_NOT_FOUND");
	});

	it("creates assignments when all family members belong to the family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.familyMember.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{ id: 100, familyId: 10 },
			{ id: 101, familyId: 10 },
		]);

		(
			prismaMock.$transaction as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{ taskId: 1, familyMemberId: 100 },
			{ taskId: 1, familyMemberId: 101 },
		]);

		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/task-assignments")
			.send({
				taskId: 1,
				familyMemberIds: [100, 101],
			});

		expect(response.status).toBe(201);
		const body = response.body as { data: TaskAssignment[] };
		expect(body.data).toHaveLength(2);
		expect(body.data[0].taskId).toBe(1);
	});

	it("rejects assignment creation when some members are outside the family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		// Only one member matches even though two are requested
		(
			prismaMock.familyMember.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([{ id: 100, familyId: 10 }]);

		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/task-assignments")
			.send({
				taskId: 1,
				familyMemberIds: [100, 999],
			});

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		expect(response.body.error.message).toBe(
			"All family members must belong to the current family",
		);
	});

	it("returns 404 when deleting a non-existent task assignment", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.taskAssignment.findUnique as unknown as ReturnType<
				typeof vi.fn
			>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).delete(
			"/api/v1/task-assignments/1/100",
		);

		expect(response.status).toBe(404);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("TASK_ASSIGNMENT_NOT_FOUND");
	});

	it("returns standardized error envelope on GET assignments async failure", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.taskAssignment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("database failure"));

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/task-assignments")
			.query({ taskId: 1 });

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.message).not.toContain("database");
	});
});
