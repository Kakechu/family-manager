import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventCategory } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import eventCategoriesRouter from "./routes";

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
	eventCategory: {
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
	app.use("/api/v1/event-categories", eventCategoriesRouter);
	return app;
};

describe("event categories routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists event categories", async () => {
		(
			prismaMock.eventCategory.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				name: "School",
				color: "#ff0000",
			},
		]);

		const app = buildApp();

		const response = await request(app).get("/api/v1/event-categories");

		expect(response.status).toBe(200);
		const body = response.body as { data: EventCategory[] };
		expect(body.data).toHaveLength(1);
		expect(body.data[0].name).toBe("School");
	});

	it("creates an event category", async () => {
		(
			prismaMock.eventCategory.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			name: "Hobby",
			color: null,
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/event-categories").send({
			name: "Hobby",
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: EventCategory };
		expect(body.data.id).toBe(2);
		expect(body.data.name).toBe("Hobby");
	});
});
