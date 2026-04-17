import {
	type TaskAssignment,
	addTaskAssignmentsSchema,
	taskAssignmentSchema,
} from "@family-manager/shared";
import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
	type AuthenticatedRequest,
	authenticate,
	requireRole,
} from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { asyncHandler } from "../../shared/http/error-handler";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = z.object({
	taskId: z.coerce.number().int().positive(),
});

const paramsSchema = z.object({
	taskId: z.coerce.number().int().positive(),
	familyMemberId: z.coerce.number().int().positive(),
});

const toTaskAssignmentDto = (assignment: {
	taskId: number;
	familyMemberId: number;
}): TaskAssignment => {
	return taskAssignmentSchema.parse({
		taskId: assignment.taskId,
		familyMemberId: assignment.familyMemberId,
	});
};

router.use(authenticate);

router.get(
	"/",
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsedQuery = querySchema.safeParse(req.query);

		if (!parsedQuery.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid query parameters",
				parsedQuery.error.flatten(),
			);
			return;
		}

		const { taskId } = parsedQuery.data;

		const task = await prisma.task.findFirst({
			where: {
				id: taskId,
				familyId: req.auth.familyId,
			},
		});

		if (!task) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		const assignments = await prisma.taskAssignment.findMany({
			where: { taskId },
			orderBy: { familyMemberId: "asc" },
		});

		const dtos = assignments.map(toTaskAssignmentDto);

		sendList(res, 200, dtos);
	}),
);

router.post(
	"/",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsed = addTaskAssignmentsSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task assignment data",
				parsed.error.flatten(),
			);
			return;
		}

		const { taskId, familyMemberIds } = parsed.data;

		const task = await prisma.task.findFirst({
			where: {
				id: taskId,
				familyId: req.auth.familyId,
			},
		});

		if (!task) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		// Ensure all family members belong to the same family
		const members = await prisma.familyMember.findMany({
			where: {
				id: { in: familyMemberIds },
				familyId: req.auth.familyId,
			},
		});

		if (members.length !== familyMemberIds.length) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"All family members must belong to the current family",
			);
			return;
		}

		const created = await prisma.$transaction(
			familyMemberIds.map((familyMemberId) =>
				prisma.taskAssignment.upsert({
					where: {
						// Composite primary key
						taskId_familyMemberId: {
							taskId,
							familyMemberId,
						},
					},
					update: {},
					create: {
						taskId,
						familyMemberId,
					},
				}),
			),
		);

		const dtos = created.map(toTaskAssignmentDto);

		sendList(res, 201, dtos);
	}),
);

router.delete(
	"/:taskId/:familyMemberId",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const paramsResult = paramsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task assignment identifiers",
				paramsResult.error.flatten(),
			);
			return;
		}

		const { taskId, familyMemberId } = paramsResult.data;

		const task = await prisma.task.findFirst({
			where: {
				id: taskId,
				familyId: req.auth.familyId,
			},
		});

		if (!task) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		const existing = await prisma.taskAssignment.findUnique({
			where: {
				taskId_familyMemberId: {
					taskId,
					familyMemberId,
				},
			},
		});

		if (!existing) {
			sendError(
				res,
				404,
				"TASK_ASSIGNMENT_NOT_FOUND",
				"Task assignment not found",
			);
			return;
		}

		await prisma.taskAssignment.delete({
			where: {
				taskId_familyMemberId: {
					taskId,
					familyMemberId,
				},
			},
		});

		res.status(204).send();
	}),
);

export default router;
