import { z } from "zod";

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationMetaSchema = z.object({
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1).max(100),
	totalItems: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
});
