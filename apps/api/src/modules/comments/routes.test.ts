import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Comment, MAX_COMMENT_LENGTH } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { apiErrorHandler } from "../../shared/http/error-handler";
import commentsRouter from "./routes";

const authState = vi.hoisted(() => ({
	current: {
		userId: 1,
		familyId: 10,
		role: "PARENT" as "PARENT" | "CHILD",
	},
}));

vi.mock("../../middleware/auth", () => {
	return {
		authenticate: (
			req: AuthenticatedRequest,
			_res: Response,
			next: NextFunction,
		): void => {
			req.auth = authState.current;
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
	comment: {
		findMany: vi.fn(),
		create: vi.fn(),
		count: vi.fn(),
	},
	familyMember: {
		findFirst: vi.fn(),
	},
	taskAssignment: {
		findFirst: vi.fn(),
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
	app.use("/api/v1/comments", commentsRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("comments routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		authState.current = {
			userId: 1,
			familyId: 10,
			role: "PARENT",
		};
	});

	it("lists comments for a task within the same family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.comment.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
		(
			prismaMock.comment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				text: "First comment",
				createdAt: new Date("2026-04-15T10:00:00.000Z"),
				taskId: 1,
				userId: 1,
				user: {
					familyMember: {
						firstName: "Jamie",
						lastName: "Smith",
					},
				},
			},
		]);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/comments")
			.query({ taskId: 1 });

		expect(response.status).toBe(200);
		const body = response.body as {
			data: Comment[];
			meta: {
				page: number;
				pageSize: number;
				totalItems: number;
				totalPages: number;
			};
		};
		expect(body.data).toHaveLength(1);
		expect(body.meta).toEqual({
			page: 1,
			pageSize: 20,
			totalItems: 1,
			totalPages: 1,
		});
		expect(body.data[0].text).toBe("First comment");
		expect(body.data[0].authorName).toBe("Jamie Smith");
	});

	it("does not fall back to the user's email local-part for author name", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.comment.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
		(
			prismaMock.comment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				text: "Email-backed comment",
				createdAt: new Date("2026-04-15T10:00:00.000Z"),
				taskId: 1,
				userId: 1,
				user: {
					email: "parent@example.com",
					familyMember: null,
				},
			},
		]);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/comments")
			.query({ taskId: 1 });

		expect(response.status).toBe(200);
		const body = response.body as {
			data: Comment[];
			meta: {
				page: number;
				pageSize: number;
				totalItems: number;
				totalPages: number;
			};
		};
		expect(body.meta).toEqual({
			page: 1,
			pageSize: 20,
			totalItems: 1,
			totalPages: 1,
		});
		expect(body.data[0].authorName).toBeUndefined();
	});

	it("returns 404 when listing comments for a task outside the family", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/comments")
			.query({ taskId: 999 });

		expect(response.status).toBe(404);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("TASK_NOT_FOUND");
	});

	it("creates a comment for a task in the same family", async () => {
		authState.current = {
			userId: 1,
			familyId: 10,
			role: "PARENT",
		};

		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.comment.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			text: "New comment",
			createdAt: new Date("2026-04-15T11:00:00.000Z"),
			taskId: 1,
			userId: 1,
			user: {
				familyMember: {
					firstName: "Pat",
					lastName: "Parent",
				},
			},
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/comments").send({
			taskId: 1,
			text: "New comment",
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: Comment };
		expect(body.data.id).toBe(2);
		expect(body.data.taskId).toBe(1);
		expect(body.data.userId).toBe(1);
		expect(body.data.authorName).toBe("Pat Parent");
	});

	it("allows an assigned child to create a comment", async () => {
		authState.current = {
			userId: 2,
			familyId: 10,
			role: "CHILD",
		};

		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.familyMember.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 100,
		});

		(
			prismaMock.taskAssignment.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			taskId: 1,
			familyMemberId: 100,
		});

		(
			prismaMock.comment.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 3,
			text: "Assigned child comment",
			createdAt: new Date("2026-04-15T12:00:00.000Z"),
			taskId: 1,
			userId: 2,
			user: {
				familyMember: {
					firstName: "Taylor",
					lastName: "Child",
				},
			},
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/comments").send({
			taskId: 1,
			text: "Assigned child comment",
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: Comment };
		expect(body.data.authorName).toBe("Taylor Child");
	});

	it("rejects a child who is not assigned to the task", async () => {
		authState.current = {
			userId: 2,
			familyId: 10,
			role: "CHILD",
		};

		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.familyMember.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 100,
		});

		(
			prismaMock.taskAssignment.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).post("/api/v1/comments").send({
			taskId: 1,
			text: "Not allowed",
		});

		expect(response.status).toBe(403);
		expect(response.body.error.code).toBe("FORBIDDEN");
		expect(prismaMock.comment.create).not.toHaveBeenCalled();
	});

	it("rejects invalid comment payload", async () => {
		const app = buildApp();

		const response = await request(app).post("/api/v1/comments").send({
			text: "",
		});

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects overly long comment payloads", async () => {
		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/comments")
			.send({
				taskId: 1,
				text: "a".repeat(MAX_COMMENT_LENGTH + 1),
			});

		expect(response.status).toBe(400);
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		expect(response.body.error.message).toBe("Invalid comment data");
		expect(response.body.error.details).toBeDefined();
	});

	// Regression tests: async error containment
	// Verify that forced async failures return standardized error envelope

	it("returns standardized error envelope on GET comments async failure", async () => {
		// Force an async error in findMany
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.comment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Database connection lost"));

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/comments")
			.query({ taskId: 1 });

		expect(response.status).toBe(500);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		// Verify internal error details are NOT exposed
		expect(response.body.error.message).not.toContain("Database");
	});

	it("returns standardized error envelope on POST comment async failure", async () => {
		(
			prismaMock.task.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		// Force an async error in create
		(
			prismaMock.comment.create as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Network timeout"));

		const app = buildApp();

		const response = await request(app).post("/api/v1/comments").send({
			taskId: 1,
			text: "New comment",
		});

		expect(response.status).toBe(500);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		// Verify internal error message is not exposed
		expect(response.body.error.message).toBe("Internal server error");
	});
});
