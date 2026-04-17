import {
	type TaskCategory,
	createTaskCategorySchema,
	paginationQuerySchema,
	taskCategorySchema,
	updateTaskCategorySchema,
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
import { asyncHandler } from "../../shared/http/error-handler";
import {
	buildPaginationMeta,
	getPaginationArgs,
} from "../../shared/http/pagination";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = paginationQuerySchema;

const toTaskCategoryDto = (category: {
	id: number;
	name: string;
	color: string | null;
}): TaskCategory => {
	return taskCategorySchema.parse({
		id: category.id,
		name: category.name,
		color: category.color,
	});
};

const idParamSchema = z.object({
	id: z.coerce.number().int().positive(),
});

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

		const { page, pageSize } = parsedQuery.data;
		const where = {
			familyId: req.auth.familyId,
		} as unknown as Prisma.TaskCategoryWhereInput;

		const totalItems = await prisma.taskCategory.count({ where });
		const categories = await prisma.taskCategory.findMany({
			where,
			orderBy: { id: "asc" },
			...getPaginationArgs({ page, pageSize }),
		});

		const dtos = categories.map(toTaskCategoryDto);

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

		const parsed = createTaskCategorySchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task category data",
				parsed.error.flatten(),
			);
			return;
		}

		const { name, color } = parsed.data;

		const created = await prisma.taskCategory.create({
			data: {
				name,
				color: color ?? null,
				familyId: req.auth.familyId,
			},
		});

		const dto = toTaskCategoryDto(created);

		sendData(res, 201, dto);
	}),
);

router.patch(
	"/:id",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		const paramsResult = idParamSchema.safeParse(req.params);

		if (!paramsResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task category id",
				paramsResult.error.flatten(),
			);
			return;
		}

		const parsed = updateTaskCategorySchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task category data",
				parsed.error.flatten(),
			);
			return;
		}

		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const { id } = paramsResult.data;

		const existing = await prisma.taskCategory.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "TASK_CATEGORY_NOT_FOUND", "Task category not found");
			return;
		}

		const { name, color } = parsed.data;

		const updated = await prisma.taskCategory.update({
			where: { id },
			data: {
				...(name !== undefined ? { name } : {}),
				...(color !== undefined ? { color: color ?? null } : {}),
			},
		});

		const dto = toTaskCategoryDto(updated);

		sendData(res, 200, dto);
	}),
);

router.delete(
	"/:id",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		const paramsResult = idParamSchema.safeParse(req.params);

		if (!paramsResult.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task category id",
				paramsResult.error.flatten(),
			);
			return;
		}

		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const { id } = paramsResult.data;

		const existing = await prisma.taskCategory.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "TASK_CATEGORY_NOT_FOUND", "Task category not found");
			return;
		}

		await prisma.taskCategory.delete({ where: { id } });

		res.status(204).send();
	}),
);

export default router;
