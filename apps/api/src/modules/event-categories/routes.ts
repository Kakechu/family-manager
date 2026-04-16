import {
	type EventCategory,
	createEventCategorySchema,
	eventCategorySchema,
	updateEventCategorySchema,
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
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const toEventCategoryDto = (category: {
	id: number;
	name: string;
	color: string | null;
}): EventCategory => {
	return eventCategorySchema.parse({
		id: category.id,
		name: category.name,
		color: category.color,
	});
};

const idParamSchema = z.object({
	id: z.coerce.number().int().positive(),
});

router.use(authenticate);

router.get("/", async (_req: AuthenticatedRequest, res) => {
	const categories = await prisma.eventCategory.findMany({
		orderBy: { id: "asc" },
	});

	const dtos = categories.map(toEventCategoryDto);

	sendList(res, 200, dtos);
});

router.post(
	"/",
	requireRole([UserRole.PARENT]),
	async (_req: AuthenticatedRequest, res) => {
		const parsed = createEventCategorySchema.safeParse(_req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event category data",
				parsed.error.flatten(),
			);
			return;
		}

		const { name, color } = parsed.data;

		try {
			const created = await prisma.eventCategory.create({
				data: {
					name,
					color: color ?? null,
				},
			});

			const dto = toEventCategoryDto(created);

			sendData(res, 201, dto);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("event_category_create_failed", error);
			sendError(
				res,
				500,
				"INTERNAL_SERVER_ERROR",
				"Failed to create event category",
			);
		}
	},
);

router.patch(
	"/:id",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		const paramsResult = idParamSchema.safeParse(req.params);

		if (!paramsResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event category id",
				paramsResult.error.flatten(),
			);
			return;
		}

		const parsed = updateEventCategorySchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event category data",
				parsed.error.flatten(),
			);
			return;
		}

		const { id } = paramsResult.data;

		const existing = await prisma.eventCategory.findUnique({
			where: { id },
		});

		if (!existing) {
			sendError(
				res,
				404,
				"EVENT_CATEGORY_NOT_FOUND",
				"Event category not found",
			);
			return;
		}

		const { name, color } = parsed.data;

		const updated = await prisma.eventCategory.update({
			where: { id },
			data: {
				...(name !== undefined ? { name } : {}),
				...(color !== undefined ? { color: color ?? null } : {}),
			},
		});

		const dto = toEventCategoryDto(updated);

		sendData(res, 200, dto);
	},
);

router.delete(
	"/:id",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		const paramsResult = idParamSchema.safeParse(req.params);

		if (!paramsResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid event category id",
				paramsResult.error.flatten(),
			);
			return;
		}

		const { id } = paramsResult.data;

		const existing = await prisma.eventCategory.findUnique({
			where: { id },
		});

		if (!existing) {
			sendError(
				res,
				404,
				"EVENT_CATEGORY_NOT_FOUND",
				"Event category not found",
			);
			return;
		}

		await prisma.eventCategory.delete({ where: { id } });

		res.status(204).send();
	},
);

export default router;
