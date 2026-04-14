import { z } from "zod";

export const familyMemberRoleSchema = z.enum(["ADULT", "CHILD"]);

export const familyMemberSchema = z.object({
	id: z.number().int().positive(),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	dateOfBirth: z.string().datetime().nullable().optional(),
	role: familyMemberRoleSchema,
	familyId: z.number().int().positive(),
	userId: z.number().int().positive().nullable().optional(),
});

export const createFamilyMemberSchema = familyMemberSchema
	.omit({
		id: true,
		familyId: true,
	})
	.extend({
		dateOfBirth: z.string().datetime().nullable().optional(),
	});

export const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

export type FamilyMember = z.infer<typeof familyMemberSchema>;
