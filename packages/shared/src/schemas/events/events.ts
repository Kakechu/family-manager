import { z } from "zod";

export const eventSchema = z.object({
	id: z.number().int().positive(),
	title: z.string().min(1),
	description: z.string().min(1).nullable().optional(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	categoryId: z.number().int().positive(),
	createdBy: z.number().int().positive(),
	familyId: z.number().int().positive(),
});

export const createEventSchema = eventSchema.omit({
	id: true,
	createdBy: true,
	familyId: true,
});

export const updateEventSchema = createEventSchema.partial();

export type Event = z.infer<typeof eventSchema>;
