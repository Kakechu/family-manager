import { z } from "zod";

export const userRoleSchema = z.enum(["PARENT", "CHILD"]);

export const authUserSchema = z.object({
	id: z.number().int().positive(),
	email: z.string().email(),
	role: userRoleSchema,
	familyId: z.number().int().positive(),
});

export const loginRequestSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

export const registerRequestSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	familyName: z.string().min(1),
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
