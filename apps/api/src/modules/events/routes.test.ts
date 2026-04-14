import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Event } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import eventsRouter from "./routes";

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
	event: {
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
	app.use("/api/v1/events", eventsRouter);
	return app;
};

describe("events routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists events scoped to family", async () => {
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
		const body = response.body as { data: Event[] };
		expect(body.data).toHaveLength(1);
		expect(body.data[0].title).toBe("Doctor appointment");
		expect(body.data[0].familyId).toBe(10);
	});

	it("creates an event", async () => {
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
	});

	it("applies family member filtering with includeUnassigned flag", async () => {
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
});
