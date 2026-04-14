import { describe, expect, it } from "vitest";
import { familyMemberSchema } from "./family-members";

describe("familyMemberSchema", () => {
	it("accepts a valid family member", () => {
		const result = familyMemberSchema.safeParse({
			id: 1,
			firstName: "Parent",
			lastName: "One",
			dateOfBirth: null,
			role: "ADULT",
			familyId: 10,
			userId: 1,
		});

		expect(result.success).toBe(true);
	});

	it("rejects an invalid role", () => {
		const result = familyMemberSchema.safeParse({
			id: 1,
			firstName: "Parent",
			lastName: "One",
			dateOfBirth: null,
			// @ts-expect-error testing runtime validation
			role: "UNKNOWN",
			familyId: 10,
			userId: 1,
		});

		expect(result.success).toBe(false);
	});
});
