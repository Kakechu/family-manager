import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventAssignment } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { apiErrorHandler } from "../../shared/http/error-handler";
import eventAssignmentsRouter from "./routes";

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
		findFirst: vi.fn(),
	},
	eventAssignment: {
		findMany: vi.fn(),
		findUnique: vi.fn(),
		upsert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
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
	app.use("/api/v1/event-assignments", eventAssignmentsRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("event assignments routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists assignments for an event", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.eventAssignment.count as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(1);
		(
			prismaMock.eventAssignment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				eventId: 1,
				familyMemberId: 100,
				attendanceStatus: "PENDING",
			},
		]);

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/event-assignments")
			.query({ eventId: 1 });

		expect(response.status).toBe(200);
		const body = response.body as {
			data: EventAssignment[];
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
		expect(body.data[0].eventId).toBe(1);
	});

	it("creates assignments for an event", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
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
			{
				eventId: 1,
				familyMemberId: 100,
				attendanceStatus: "PENDING",
			},
			{
				eventId: 1,
				familyMemberId: 101,
				attendanceStatus: "PENDING",
			},
		]);

		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/event-assignments")
			.send({
				eventId: 1,
				familyMemberIds: [100, 101],
			});

		expect(response.status).toBe(201);
		const body = response.body as { data: EventAssignment[] };
		expect(body.data).toHaveLength(2);
	});

	it("returns standardized error envelope on GET assignments async failure", async () => {
		(
			prismaMock.event.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			familyId: 10,
		});

		(
			prismaMock.eventAssignment.findMany as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("database failure"));

		const app = buildApp();

		const response = await request(app)
			.get("/api/v1/event-assignments")
			.query({ eventId: 1 });

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.message).not.toContain("database");
	});
});
