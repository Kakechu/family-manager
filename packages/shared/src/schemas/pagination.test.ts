import { describe, expect, it } from "vitest";

import { paginationMetaSchema, paginationQuerySchema } from "./pagination";

describe("pagination schemas", () => {
	it("applies pagination defaults", () => {
		const result = paginationQuerySchema.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ page: 1, pageSize: 20 });
		}
	});

	it("rejects page sizes above the maximum", () => {
		const result = paginationQuerySchema.safeParse({ pageSize: 101 });

		expect(result.success).toBe(false);
	});

	it("accepts zero total pages for empty result sets", () => {
		const result = paginationMetaSchema.safeParse({
			page: 1,
			pageSize: 20,
			totalItems: 0,
			totalPages: 0,
		});

		expect(result.success).toBe(true);
	});
});
