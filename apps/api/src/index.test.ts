import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
	user: {
		findUnique: vi.fn(),
	},
}));

vi.mock("./shared/db/client", () => {
	return {
		prisma: prismaMock,
	};
});

import { createApp } from "./index";

describe("api app wiring", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns sanitized error envelope for unhandled async route failures via global middleware", async () => {
		(
			prismaMock.user.findUnique as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error("database leaked detail"));

		const app = createApp();

		const response = await request(app).post("/api/v1/auth/login").send({
			email: "parent@example.com",
			password: "Password123!",
		});

		expect(response.status).toBe(500);
		expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(response.body.error.message).toBe("Internal server error");
		expect(response.body.error.details).toBeUndefined();
	});
});
