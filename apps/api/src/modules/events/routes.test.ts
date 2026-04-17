import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Event } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import eventsRouter from "./routes";

const authState = vi.hoisted(() => ({
	role: "PARENT" as "PARENT" | "CHILD",
}));

vi.mock("../../middleware/auth", () => {
	return {
		authenticate: (
			req: AuthenticatedRequest,
			_res: Response,
			next: NextFunction,
		): void => {
			// Attach a fake auth context
			req.auth = { userId: 1, familyId: 10, role: authState.role };
			next();
		},
		requireRole:
			(allowedRoles: Array<"PARENT" | "CHILD">) =>
			(req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
				if (!req.auth || !allowedRoles.includes(req.auth.role)) {
					res.status(403).json({
						error: {
							code: "FORBIDDEN",
							message: "You are not allowed to perform this action",
						},
					});
					return;
				}
				next();
			},
	};
});

const prismaMock = vi.hoisted(() => ({
	event: {
		findMany: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
	},
	eventCategory: {
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
	app.use("/api/v1/events", eventsRouter);
	return app;
};

describe("events routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		authState.role = "PARENT";
	});

	it("lists events scoped to family", async () => {
		(
			prismaMock.event.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				title: "Doctor appointment",
				description: null,
				startTime: new Date("2026-04-15T10:00:00Z"),
				endTime: new Date("2026-04-15T11:00:00Z"),
				categoryId: 2,
				createdBy: 1,
				familyId: 10,
			},
		]);

		const app = buildApp();

		const response = await request(app).get("/api/v1/events");

		expect(response.status).toBe(200);
		const body = response.body as {
			data: Event[];
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
		expect(body.data[0].title).toBe("Doctor appointment");
		expect(body.data[0].familyId).toBe(10);
	});

	it("creates an event", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1, familyId: 10, name: "School", color: null });

		(
			prismaMock.event.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/events").send({
			title: "School meeting",
			startTime: "2026-04-16T08:00:00.000Z",
			endTime: "2026-04-16T09:00:00.000Z",
			categoryId: 1,
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: Event };
		expect(body.data.id).toBe(2);
		expect(body.data.familyId).toBe(10);
		expect(prismaMock.eventCategory.findFirst).toHaveBeenCalledWith({
			where: { id: 1, familyId: 10 },
		});
	});

	it("rejects create when event category is outside authenticated family", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app).post("/api/v1/events").send({
			title: "School meeting",
			startTime: "2026-04-16T08:00:00.000Z",
			endTime: "2026-04-16T09:00:00.000Z",
			categoryId: 999,
		});

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("EVENT_CATEGORY_NOT_FOUND");
		expect(response.body.error.message).toBe("Event category not found");
		expect(prismaMock.event.create).not.toHaveBeenCalled();
	});

	it("returns sanitized 500 response when event creation fails", async () => {
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1, familyId: 10, name: "School", color: null });

		(
			prismaMock.event.create as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("db exploded"));

		const app = buildApp();

		const response = await request(app).post("/api/v1/events").send({
			title: "School meeting",
			startTime: "2026-04-16T08:00:00.000Z",
			endTime: "2026-04-16T09:00:00.000Z",
			categoryId: 1,
		});

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.details).toBeUndefined();
	});

	it("applies family member filtering with includeUnassigned flag", async () => {
		(
			prismaMock.event.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(0);
		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		const app = buildApp();

		await request(app)
			.get("/api/v1/events")
			.query({ familyMemberId: 100, includeUnassigned: true });

		expect(prismaMock.event.findMany).toHaveBeenCalledWith({
			where: {
				familyId: 10,
				AND: [
					{
						OR: [
							{ assignments: { some: { familyMemberId: 100 } } },
							{ assignments: { none: {} } },
						],
					},
				],
			},
			orderBy: { startTime: "asc" },
			skip: 0,
			take: 20,
		});
	});

	it("returns 400 for invalid date range query", async () => {
		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/events")
			.query({ from: "not-a-date" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		// Ensure no database query is performed when validation fails
		expect(prismaMock.event.findMany).not.toHaveBeenCalled();
	});

	it("returns 403 when a child user attempts to create an event", async () => {
		authState.role = "CHILD";

		const app = buildApp();

		const response = await request(app).post("/api/v1/events").send({
			title: "School meeting",
			startTime: "2026-04-16T08:00:00.000Z",
			endTime: "2026-04-16T09:00:00.000Z",
			categoryId: 1,
		});

		expect(response.status).toBe(403);
		expect(response.body.error.code).toBe("FORBIDDEN");
		expect(prismaMock.event.create).not.toHaveBeenCalled();
	});

	it("returns sanitized 500 response when event update fails", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});

		(
			prismaMock.event.update as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("db exploded"));

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/events/2")
			.send({ title: "Updated meeting" });

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.details).toBeUndefined();
	});

	it("updates event category when provided and owned by authenticated family", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 3,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 2, familyId: 10, name: "Doctor", color: null });
		(
			prismaMock.event.update as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 3,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 2,
			createdBy: 1,
			familyId: 10,
		});

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/events/3")
			.send({ categoryId: 2 });

		expect(response.status).toBe(200);
		expect(prismaMock.eventCategory.findFirst).toHaveBeenCalledWith({
			where: { id: 2, familyId: 10 },
		});
		expect(prismaMock.event.update).toHaveBeenCalledWith({
			where: { id: 3 },
			data: expect.objectContaining({ categoryId: 2 }),
		});
	});

	it("rejects event patch when provided category is outside authenticated family", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 4,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});
		(
			prismaMock.eventCategory.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/events/4")
			.send({ categoryId: 999 });

		expect(response.status).toBe(404);
		expect(response.body.error.code).toBe("EVENT_CATEGORY_NOT_FOUND");
		expect(response.body.error.message).toBe("Event category not found");
		expect(prismaMock.event.update).not.toHaveBeenCalled();
	});

	it("does not validate category ownership when event patch omits categoryId", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 5,
			title: "School meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});
		(
			prismaMock.event.update as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 5,
			title: "Updated meeting",
			description: null,
			startTime: new Date("2026-04-16T08:00:00Z"),
			endTime: new Date("2026-04-16T09:00:00Z"),
			categoryId: 1,
			createdBy: 1,
			familyId: 10,
		});

		const app = buildApp();

		const response = await request(app)
			.patch("/api/v1/events/5")
			.send({ title: "Updated meeting" });

		expect(response.status).toBe(200);
		expect(prismaMock.eventCategory.findFirst).not.toHaveBeenCalled();
	});
});
