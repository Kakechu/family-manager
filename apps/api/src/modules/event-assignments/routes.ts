import {
	type EventAssignment,
	addEventAssignmentsSchema,
	eventAssignmentSchema,
	paginationQuerySchema,
	updateEventAssignmentSchema,
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
import { buildPaginationMeta, getPaginationArgs } from "../../shared/http/pagination";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = paginationQuerySchema.extend({
	eventId: z.coerce.number().int().positive(),
});

const paramsSchema = z.object({
	eventId: z.coerce.number().int().positive(),
	familyMemberId: z.coerce.number().int().positive(),
});

const toEventAssignmentDto = (assignment: {
	eventId: number;
	familyMemberId: number;
	attendanceStatus: string;
}): EventAssignment => {
	return eventAssignmentSchema.parse({
		eventId: assignment.eventId,
		familyMemberId: assignment.familyMemberId,
		attendanceStatus: assignment.attendanceStatus,
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

		const { page, pageSize, eventId } = parsedQuery.data;

		const event = await prisma.event.findFirst({
			where: {
				id: eventId,
				familyId: req.auth.familyId,
			},
		});

		if (!event) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
			return;
		}

		const where = { eventId };
		const totalItems = await prisma.eventAssignment.count({ where });
		const assignments = await prisma.eventAssignment.findMany({
			where,
			orderBy: { familyMemberId: "asc" },
			...getPaginationArgs({ page, pageSize }),
		});

		const dtos = assignments.map(toEventAssignmentDto);

		sendList(
			res,
			200,
			dtos,
			buildPaginationMeta({ page, pageSize, totalItems }),
		);
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

		const parsed = addEventAssignmentsSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event assignment data",
				parsed.error.flatten(),
			);
			return;
		}

		const { eventId, familyMemberIds } = parsed.data;

		const event = await prisma.event.findFirst({
			where: {
				id: eventId,
				familyId: req.auth.familyId,
			},
		});

		if (!event) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
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
				prisma.eventAssignment.upsert({
					where: {
						// Composite primary key
						eventId_familyMemberId: {
							eventId,
							familyMemberId,
						},
					},
					update: {},
					create: {
						eventId,
						familyMemberId,
						attendanceStatus: "PENDING",
					},
				}),
			),
		);

		const dtos = created.map(toEventAssignmentDto);

		sendList(res, 201, dtos);
	}),
);

router.patch(
	"/:eventId/:familyMemberId",
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
				"Invalid event assignment identifiers",
				paramsResult.error.flatten(),
			);
			return;
		}

		const bodyResult = updateEventAssignmentSchema.safeParse(req.body);

		if (!bodyResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event assignment data",
				bodyResult.error.flatten(),
			);
			return;
		}

		const { eventId, familyMemberId } = paramsResult.data;
		const { attendanceStatus } = bodyResult.data;

		const event = await prisma.event.findFirst({
			where: {
				id: eventId,
				familyId: req.auth.familyId,
			},
		});

		if (!event) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
			return;
		}

		const existing = await prisma.eventAssignment.findUnique({
			where: {
				eventId_familyMemberId: {
					eventId,
					familyMemberId,
				},
			},
		});

		if (!existing) {
			sendError(
				res,
				404,
				"EVENT_ASSIGNMENT_NOT_FOUND",
				"Event assignment not found",
			);
			return;
		}

		const updated = await prisma.eventAssignment.update({
			where: {
				eventId_familyMemberId: {
					eventId,
					familyMemberId,
				},
			},
			data: {
				attendanceStatus,
			},
		});

		const dto = toEventAssignmentDto(updated);

		sendData(res, 200, dto);
	}),
);

router.delete(
	"/:eventId/:familyMemberId",
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
				"Invalid event assignment identifiers",
				paramsResult.error.flatten(),
			);
			return;
		}

		const { eventId, familyMemberId } = paramsResult.data;

		const event = await prisma.event.findFirst({
			where: {
				id: eventId,
				familyId: req.auth.familyId,
			},
		});

		if (!event) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
			return;
		}

		const existing = await prisma.eventAssignment.findUnique({
			where: {
				eventId_familyMemberId: {
					eventId,
					familyMemberId,
				},
			},
		});

		if (!existing) {
			sendError(
				res,
				404,
				"EVENT_ASSIGNMENT_NOT_FOUND",
				"Event assignment not found",
			);
			return;
		}

		await prisma.eventAssignment.delete({
			where: {
				eventId_familyMemberId: {
					eventId,
					familyMemberId,
				},
			},
		});

		res.status(204).send();
	}),
);

export default router;
