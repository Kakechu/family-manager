import { z } from "zod";

export const eventCategorySchema = z.object({
	id: z.number().int().positive(),
	name: z.string().min(1),
	color: z.string().min(1).nullable().optional(),
});

export const createEventCategorySchema = eventCategorySchema.omit({
	id: true,
});

export const updateEventCategorySchema = createEventCategorySchema.partial();

export type EventCategory = z.infer<typeof eventCategorySchema>;
