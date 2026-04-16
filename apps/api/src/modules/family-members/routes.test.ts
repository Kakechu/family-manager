import cookieParser from "cookie-parser";
import express, { type NextFunction, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FamilyMember } from "@family-manager/shared";
import type { AuthenticatedRequest } from "../../middleware/auth";
import familyMembersRouter from "./routes";

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

// Use vi.hoisted so prismaMock is initialized safely before mocked module evaluation
const prismaMock = vi.hoisted(() => ({
	familyMember: {
		findMany: vi.fn(),
		create: vi.fn(),
		findFirst: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	user: {
		findUnique: vi.fn(),
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
	app.use("/api/v1/family-members", familyMembersRouter);
	return app;
};

describe("family members routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		authState.role = "PARENT";
	});

	it("lists family members scoped to family", async () => {
		(
			prismaMock.familyMember.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				firstName: "Parent",
				lastName: "One",
				dateOfBirth: null,
				role: "ADULT",
				familyId: 10,
				userId: 1,
			},
		]);

		const app = buildApp();

		const response = await request(app).get("/api/v1/family-members");

		expect(response.status).toBe(200);
		const body = response.body as { data: FamilyMember[] };
		expect(body.data).toHaveLength(1);
		expect(body.data[0].firstName).toBe("Parent");
		// ensure the DTO familyId matches auth.familyId
		expect(body.data[0].familyId).toBe(10);
	});

	it("creates a family member", async () => {
		(
			prismaMock.familyMember.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 2,
			firstName: "Child",
			lastName: "One",
			dateOfBirth: null,
			role: "CHILD",
			familyId: 10,
			userId: null,
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/family-members").send({
			firstName: "Child",
			lastName: "One",
			role: "CHILD",
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: FamilyMember };
		expect(body.data.id).toBe(2);
		expect(body.data.familyId).toBe(10);
	});

	it("returns 403 when a child user attempts to create a family member", async () => {
		authState.role = "CHILD";

		const app = buildApp();

		const response = await request(app).post("/api/v1/family-members").send({
			firstName: "Child",
			lastName: "One",
			role: "CHILD",
		});

		expect(response.status).toBe(403);
		expect(response.body.error.code).toBe("FORBIDDEN");
		expect(prismaMock.familyMember.create).not.toHaveBeenCalled();
	});

	it("rejects linking a user account from another family", async () => {
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 99, familyId: 999 });

		const app = buildApp();

		const response = await request(app).post("/api/v1/family-members").send({
			firstName: "Member",
			lastName: "Two",
			role: "ADULT",
			userId: 99,
		});

		expect(response.status).toBe(400);
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
		expect(response.body.error.message).toBe(
			"Linked user must belong to the current family",
		);
		expect(prismaMock.familyMember.create).not.toHaveBeenCalled();
	});
});
