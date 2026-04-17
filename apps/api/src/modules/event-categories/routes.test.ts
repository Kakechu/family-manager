import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventCategory } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { apiErrorHandler } from "../../shared/http/error-handler";
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
	app.use("/api/v1/event-categories", eventCategoriesRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("event categories routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists event categories", async () => {
		(
			prismaMock.eventCategory.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
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
		expect(prismaMock.eventCategory.findMany).toHaveBeenCalledWith({
			where: { familyId: 10 },
			orderBy: { id: "asc" },
			skip: 0,
			take: 20,
		});
		const body = response.body as {
			data: EventCategory[];
			meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
		};
		expect(body.data).toHaveLength(1);
		expect(body.meta).toEqual({
			page: 1,
			pageSize: 20,
			totalItems: 1,
			totalPages: 1,
		});
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
		expect(prismaMock.eventCategory.create).toHaveBeenCalledWith({
			data: {
				name: "Hobby",
				color: null,
				familyId: 10,
			},
		});
		const body = response.body as { data: EventCategory };
		expect(body.data.id).toBe(2);
		expect(body.data.name).toBe("Hobby");
	});

	it("returns not found for cross-family update attempts", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/event-categories/44")
			.send({ name: "Updated" });

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("EVENT_CATEGORY_NOT_FOUND");
		expect(prismaMock.eventCategory.findFirst).toHaveBeenCalledWith({
			where: {
				id: 44,
				familyId: 10,
			},
		});
		expect(prismaMock.eventCategory.update).not.toHaveBeenCalled();
	});

	it("updates an event category within the same family", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 12, name: "School", color: "#ff0000" });
		(
			prismaMock.eventCategory.update as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 12, name: "School", color: "#00ff00" });

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/event-categories/12")
			.send({ color: "#00ff00" });

		expect(response.status).toBe(200);
		expect(prismaMock.eventCategory.update).toHaveBeenCalledWith({
			where: { id: 12 },
			data: { color: "#00ff00" },
		});
		expect((response.body as { data: EventCategory }).data.color).toBe(
			"#00ff00",
		);
	});

	it("returns not found for cross-family delete attempts", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).delete("/api/v1/event-categories/44");

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("EVENT_CATEGORY_NOT_FOUND");
		expect(prismaMock.eventCategory.findFirst).toHaveBeenCalledWith({
			where: {
				id: 44,
				familyId: 10,
			},
		});
		expect(prismaMock.eventCategory.delete).not.toHaveBeenCalled();
	});

	it("deletes an event category within the same family", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 15, name: "Doctor", color: null });

		const app = buildApp();

		const response = await request(app).delete("/api/v1/event-categories/15");

		expect(response.status).toBe(204);
		expect(prismaMock.eventCategory.delete).toHaveBeenCalledWith({
			where: { id: 15 },
		});
	});

	it("returns sanitized 500 response when category creation fails", async () => {
		(
			prismaMock.eventCategory.create as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("db exploded"));

		const app = buildApp();

		const response = await request(app).post("/api/v1/event-categories").send({
			name: "Hobby",
		});

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.details).toBeUndefined();
	});
});
