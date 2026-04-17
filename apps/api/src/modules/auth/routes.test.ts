import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@family-manager/shared";
import { apiErrorHandler } from "../../shared/http/error-handler";
import authRouter from "./routes";

// Use vi.hoisted so prismaMock is initialized safely before mocked module evaluation
const prismaMock = vi.hoisted(() => ({
	user: {
		findUnique: vi.fn(),
		create: vi.fn(),
	},
	family: {
		create: vi.fn(),
	},
	familyMember: {
		create: vi.fn(),
	},
	$transaction: vi.fn(),
}));

// Mock Prisma client and helpers
vi.mock("../../shared/db/client", () => {
	return {
		prisma: prismaMock,
	};
});

vi.mock("../../shared/utils/password", () => ({
	hashPassword: vi.fn(async () => "hash"),
	verifyPassword: vi.fn(async () => true),
}));

vi.mock("../../shared/utils/jwt", () => ({
	signAccessToken: vi.fn(() => "test-token"),
}));

const buildApp = () => {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());
	app.use("/api/v1/auth", authRouter);
	app.use(apiErrorHandler);
	return app;
};

describe("auth routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("rejects invalid login credentials", async () => {
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: "wrong@example.com", password: "password" });

		expect(response.status).toBe(401);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
	});

	it("rejects invalid login payload", async () => {
		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: "not-an-email" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("VALIDATION_ERROR");
	});

	it("registers a new user and sets auth cookie", async () => {
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		(
			prismaMock.family.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 10,
			name: "Doe family",
		});

		(
			prismaMock.user.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			email: "parent@example.com",
			passwordHash: "hash",
			role: "PARENT",
			familyId: 10,
		});

		(
			prismaMock.familyMember.create as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 100,
			firstName: "Parent",
			lastName: "One",
			dateOfBirth: null,
			role: "ADULT",
			familyId: 10,
			userId: 1,
		});

		(
			prismaMock.$transaction as unknown as ReturnType<typeof vi.fn>
		).mockImplementation(async (fn: (tx: unknown) => unknown) => {
			return fn({
				family: { create: prismaMock.family.create },
				user: { create: prismaMock.user.create },
				familyMember: { create: prismaMock.familyMember.create },
			});
		});

		const app = buildApp();

		const response = await request(app).post("/api/v1/auth/register").send({
			email: "parent@example.com",
			password: "Password123!",
			familyName: "Doe family",
			firstName: "Parent",
			lastName: "One",
		});

		expect(response.status).toBe(201);
		const body = response.body as { data: AuthUser };
		expect(body.data.email).toBe("parent@example.com");
		expect(body.data.familyId).toBe(10);
		expect(response.headers["set-cookie"]).toBeDefined();
	});

	// Regression tests: async error containment
	// Verify that forced async failures return standardized error envelope

	it("returns standardized error envelope on register async failure", async () => {
		// Force an async error in findUnique
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Database connection lost"));

		const app = buildApp();

		const response = await request(app).post("/api/v1/auth/register").send({
			email: "parent@example.com",
			password: "Password123!",
			familyName: "Doe family",
			firstName: "Parent",
			lastName: "One",
		});

		expect(response.status).toBe(500);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		// Verify internal error details are NOT exposed
		expect(response.body.error.message).not.toContain("Database connection");
	});

	it("returns standardized error envelope on login async failure", async () => {
		// Force an async error
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("Network timeout"));

		const app = buildApp();

		const response = await request(app)
			.post("/api/v1/auth/login")
			.send({ email: "test@example.com", password: "Password123!" });

		expect(response.status).toBe(500);
		expect(response.body.error).toBeDefined();
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		// Verify internal details are NOT exposed
		expect(response.body.error.message).not.toContain("Network");
	});

});
