import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
}));

// Mock Prisma client and password helpers
vi.mock("../../shared/db/client", () => {
	return {
		prisma: prismaMock,
	};
});

vi.mock("../../shared/utils/password", () => ({
	hashPassword: vi.fn(async () => "hash"),
	verifyPassword: vi.fn(async () => true),
}));

const buildApp = () => {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());
	app.use("/api/v1/auth", authRouter);
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
});
