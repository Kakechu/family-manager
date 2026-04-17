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
		findUnique: vi.fn(),
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
		const body = response.body as { data: TaskCategory[] };
		expect(body.data).toHaveLength(1);
		expect(body.data[0].name).toBe("Home");
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
