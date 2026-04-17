import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskCategory } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { apiErrorHandler } from "../../shared/http/error-handler";
import taskCategoriesRouter from "./routes";

vi.mock("../../middleware/auth", () => {
	return {
		authenticate: (
			req: AuthenticatedRequest,
			_res: Response,
			next: NextFunction,
		): void => {
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
	taskCategory: {
		findMany: vi.fn(),
		create: vi.fn(),
		findFirst: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
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
	app.use("/api/v1/task-categories", taskCategoriesRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("task categories routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists task categories", async () => {
		(
			prismaMock.taskCategory.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
		(
			prismaMock.taskCategory.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				name: "Home",
				color: "#00aa00",
			},
		]);

		const app = buildApp();

		const response = await request(app).get("/api/v1/task-categories");

		expect(response.status).toBe(200);
		expect(prismaMock.taskCategory.findMany).toHaveBeenCalledWith({
			where: { familyId: 10 },
			orderBy: { id: "asc" },
			skip: 0,
			take: 20,
		});
		const body = response.body as {
			data: TaskCategory[];
			meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
		};
		expect(body.data).toHaveLength(1);
		expect(body.meta).toEqual({
			page: 1,
			pageSize: 20,
			totalItems: 1,
			totalPages: 1,
		});
		expect(body.data[0].name).toBe("Home");
	});

	it("creates a task category for authenticated family scope", async () => {
		(
			prismaMock.taskCategory.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			name: "Homework",
			color: null,
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/task-categories").send({
			name: "Homework",
		});

		expect(response.status).toBe(201);
		expect(prismaMock.taskCategory.create).toHaveBeenCalledWith({
			data: {
				name: "Homework",
				color: null,
				familyId: 10,
			},
		});
		expect((response.body as { data: TaskCategory }).data.name).toBe(
			"Homework",
		);
	});

	it("returns not found for cross-family update attempts", async () => {
		(
			prismaMock.taskCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/task-categories/55")
			.send({ name: "Updated" });

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("TASK_CATEGORY_NOT_FOUND");
		expect(prismaMock.taskCategory.findFirst).toHaveBeenCalledWith({
			where: {
				id: 55,
				familyId: 10,
			},
		});
		expect(prismaMock.taskCategory.update).not.toHaveBeenCalled();
	});

	it("updates a task category within the same family", async () => {
		(
			prismaMock.taskCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 7, name: "Home", color: "#00aa00" });
		(
			prismaMock.taskCategory.update as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 7, name: "Home", color: "#1144aa" });

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/task-categories/7")
			.send({ color: "#1144aa" });

		expect(response.status).toBe(200);
		expect(prismaMock.taskCategory.update).toHaveBeenCalledWith({
			where: { id: 7 },
			data: { color: "#1144aa" },
		});
		expect((response.body as { data: TaskCategory }).data.color).toBe(
			"#1144aa",
		);
	});

	it("returns not found for cross-family delete attempts", async () => {
		(
			prismaMock.taskCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).delete("/api/v1/task-categories/55");

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("TASK_CATEGORY_NOT_FOUND");
		expect(prismaMock.taskCategory.findFirst).toHaveBeenCalledWith({
			where: {
				id: 55,
				familyId: 10,
			},
		});
		expect(prismaMock.taskCategory.delete).not.toHaveBeenCalled();
	});

	it("deletes a task category within the same family", async () => {
		(
			prismaMock.taskCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 9, name: "Chore", color: null });

		const app = buildApp();

		const response = await request(app).delete("/api/v1/task-categories/9");

		expect(response.status).toBe(204);
		expect(prismaMock.taskCategory.delete).toHaveBeenCalledWith({
			where: { id: 9 },
		});
	});

	it("returns standardized error envelope on task category async failure", async () => {
		(
			prismaMock.taskCategory.findMany as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("database failure"));

		const app = buildApp();

		const response = await request(app).get("/api/v1/task-categories");

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.message).not.toContain("database");
	});
});
