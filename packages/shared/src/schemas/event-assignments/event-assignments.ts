import { z } from "zod";

export const attendanceStatusSchema = z.enum([
	"PENDING",
	"ATTENDING",
	"NOT_ATTENDING",
	"MAYBE",
]);

export const eventAssignmentSchema = z.object({
	eventId: z.number().int().positive(),
	familyMemberId: z.number().int().positive(),
	attendanceStatus: attendanceStatusSchema,
});

export const addEventAssignmentsSchema = z.object({
	eventId: z.number().int().positive(),
	familyMemberIds: z.array(z.number().int().positive()).nonempty(),
});

export const updateEventAssignmentSchema = z.object({
	attendanceStatus: attendanceStatusSchema,
});

export type EventAssignment = z.infer<typeof eventAssignmentSchema>;
