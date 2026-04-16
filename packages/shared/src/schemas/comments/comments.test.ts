import { describe, expect, it } from "vitest";
import { MAX_COMMENT_LENGTH, createCommentSchema } from "./comments";

describe("comment schemas", () => {
	it("accepts a valid create comment payload", () => {
		const result = createCommentSchema.safeParse({
			taskId: 1,
			text: "Need to finish this after dinner",
		});

		expect(result.success).toBe(true);
	});

	it("rejects comments that exceed the maximum length", () => {
		const result = createCommentSchema.safeParse({
			taskId: 1,
			text: "a".repeat(MAX_COMMENT_LENGTH + 1),
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`,
			);
		}
	});
});
