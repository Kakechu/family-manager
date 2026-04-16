import {
	type Event,
	createEventSchema,
	eventSchema,
	updateEventSchema,
} from "@family-manager/shared";
import { type Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
	type AuthenticatedRequest,
	authenticate,
	requireRole,
} from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = z.object({
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	familyMemberId: z.coerce.number().int().positive().optional(),
	categoryId: z.coerce.number().int().positive().optional(),
	includeUnassigned: z.coerce.boolean().optional(),
});

const toEventDto = (event: {
	id: number;
	title: string;
	description: string | null;
	startTime: Date;
	endTime: Date;
	categoryId: number;
	createdBy: number;
	familyId: number;
}): Event => {
	return eventSchema.parse({
		id: event.id,
		title: event.title,
		description: event.description,
		startTime: event.startTime.toISOString(),
		endTime: event.endTime.toISOString(),
		categoryId: event.categoryId,
		createdBy: event.createdBy,
		familyId: event.familyId,
	});
};

router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
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

	const { from, to, familyMemberId, categoryId, includeUnassigned } =
		parsedQuery.data;

	const where: Prisma.EventWhereInput = {
		familyId: req.auth.familyId,
		...(categoryId ? { categoryId } : {}),
		...(from || to
			? {
					startTime: from ? { gte: new Date(from) } : undefined,
					endTime: to ? { lte: new Date(to) } : undefined,
				}
			: {}),
	};

	if (familyMemberId) {
		if (includeUnassigned) {
			where.AND = [
				{
					OR: [
						{ assignments: { some: { familyMemberId } } },
						{ assignments: { none: {} } },
					],
				},
			];
		} else {
			where.assignments = { some: { familyMemberId } };
		}
	}

	const events = await prisma.event.findMany({
		where,
		orderBy: { startTime: "asc" },
	});

	const dtos = events.map(toEventDto);

	sendList(res, 200, dtos);
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
	if (!req.auth) {
		sendError(res, 401, "UNAUTHORIZED", "Authentication required");
		return;
	}

	const id = Number(req.params.id);

	if (!Number.isFinite(id)) {
		sendError(res, 400, "VALIDATION_ERROR", "Invalid event id");
		return;
	}

	const event = await prisma.event.findFirst({
		where: {
			id,
			familyId: req.auth.familyId,
		},
	});

	if (!event) {
		sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
		return;
	}

	const dto = toEventDto(event);

	sendData(res, 200, dto);
});

router.post(
	"/",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsed = createEventSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event data",
				parsed.error.flatten(),
			);
			return;
		}

		const { title, description, startTime, endTime, categoryId } = parsed.data;

		const created = await prisma.event.create({
			data: {
				title,
				description: description ?? null,
				startTime: new Date(startTime),
				endTime: new Date(endTime),
				categoryId,
				createdBy: req.auth.userId,
				familyId: req.auth.familyId,
			},
		});

		const dto = toEventDto(created);

		sendData(res, 201, dto);
	},
);

router.patch(
	"/:id",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid event id");
			return;
		}

		const parsed = updateEventSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event data",
				parsed.error.flatten(),
			);
			return;
		}

		const existing = await prisma.event.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
			return;
		}

		const { title, description, startTime, endTime, categoryId } = parsed.data;

		const updated = await prisma.event.update({
			where: { id },
			data: {
				...(title !== undefined ? { title } : {}),
				...(description !== undefined
					? { description: description ?? null }
					: {}),
				...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
				...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
				...(categoryId !== undefined ? { categoryId } : {}),
			},
		});

		const dto = toEventDto(updated);

		sendData(res, 200, dto);
	},
);

router.delete(
	"/:id",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid event id");
			return;
		}

		const existing = await prisma.event.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "EVENT_NOT_FOUND", "Event not found");
			return;
		}

		await prisma.event.delete({ where: { id } });

		res.status(204).send();
	},
);

export default router;
