import { z } from "zod";

export const taskAssignmentSchema = z.object({
	taskId: z.number().int().positive(),
	familyMemberId: z.number().int().positive(),
});

export const addTaskAssignmentsSchema = z.object({
	taskId: z.number().int().positive(),
	familyMemberIds: z.array(z.number().int().positive()).nonempty(),
});

export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;
