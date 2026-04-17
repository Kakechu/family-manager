import {
	type Task,
	createTaskSchema,
	paginationQuerySchema,
	taskSchema,
	updateTaskSchema,
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
import { apiErrorHandler, asyncHandler } from "../../shared/http/error-handler";
import {
	buildPaginationMeta,
	getPaginationArgs,
} from "../../shared/http/pagination";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = paginationQuerySchema.extend({
	familyMemberId: z.coerce.number().int().positive().optional(),
	categoryId: z.coerce.number().int().positive().optional(),
	isCompleted: z.coerce.boolean().optional(),
});

const toTaskDto = (task: {
	id: number;
	title: string;
	description: string | null;
	dueDate: Date | null;
	isCompleted: boolean;
	recurrenceType: string;
	categoryId: number;
	createdBy: number;
	familyId: number;
}): Task => {
	return taskSchema.parse({
		id: task.id,
		title: task.title,
		description: task.description,
		// Serialize as ISO string in UTC when present
		// and null when there is no due date.
		dueDate: task.dueDate ? task.dueDate.toISOString() : null,
		isCompleted: task.isCompleted,
		recurrenceType: task.recurrenceType,
		categoryId: task.categoryId,
		createdBy: task.createdBy,
		familyId: task.familyId,
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

		const { page, pageSize, familyMemberId, categoryId, isCompleted } =
			parsedQuery.data;

		const where: Prisma.TaskWhereInput = {
			familyId: req.auth.familyId,
			...(categoryId ? { categoryId } : {}),
			...(typeof isCompleted === "boolean" ? { isCompleted } : {}),
		};

		if (familyMemberId) {
			where.assignments = { some: { familyMemberId } };
		}

		const totalItems = await prisma.task.count({ where });
		const tasks = await prisma.task.findMany({
			where,
			orderBy: [{ dueDate: "asc" }, { id: "asc" }],
			...getPaginationArgs({ page, pageSize }),
		});

		const dtos = tasks.map(toTaskDto);

		sendList(
			res,
			200,
			dtos,
			buildPaginationMeta({ page, pageSize, totalItems }),
		);
	}),
);

router.get(
	"/:id",
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid task id");
			return;
		}

		const task = await prisma.task.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!task) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		const dto = toTaskDto(task);

		sendData(res, 200, dto);
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

		const parsed = createTaskSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task data",
				parsed.error.flatten(),
			);
			return;
		}

		const { title, description, dueDate, recurrenceType, categoryId } =
			parsed.data;

		if (recurrenceType !== "NONE" && !dueDate) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Recurring tasks must have a due date",
			);
			return;
		}

		const category = await prisma.taskCategory.findFirst({
			where: {
				id: categoryId,
				familyId: req.auth.familyId,
			},
		});

		if (!category) {
			sendError(res, 404, "TASK_CATEGORY_NOT_FOUND", "Task category not found");
			return;
		}

		const created = await prisma.task.create({
			data: {
				title,
				description: description ?? null,
				// Store as Date in UTC when provided, otherwise null.
				...(dueDate ? { dueDate: new Date(dueDate) } : { dueDate: null }),
				isCompleted: false,
				recurrenceType,
				categoryId,
				createdBy: req.auth.userId,
				familyId: req.auth.familyId,
			},
		});

		const dto = toTaskDto(created);

		sendData(res, 201, dto);
	}),
);

router.patch(
	"/:id",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid task id");
			return;
		}

		const parsed = updateTaskSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid task data",
				parsed.error.flatten(),
			);
			return;
		}

		const existing = await prisma.task.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		const {
			title,
			description,
			dueDate,
			recurrenceType,
			categoryId,
			isCompleted,
		} = parsed.data;

		if (categoryId !== undefined) {
			const category = await prisma.taskCategory.findFirst({
				where: {
					id: categoryId,
					familyId: req.auth.familyId,
				},
			});

			if (!category) {
				sendError(
					res,
					404,
					"TASK_CATEGORY_NOT_FOUND",
					"Task category not found",
				);
				return;
			}
		}

		const effectiveRecurrenceType = recurrenceType ?? existing.recurrenceType;
		const effectiveDueDateIsNull =
			dueDate !== undefined ? dueDate === null : existing.dueDate === null;

		if (effectiveRecurrenceType !== "NONE" && effectiveDueDateIsNull) {
			// Prevent updates that would leave a recurring task with no due date.
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Recurring tasks must have a due date",
			);
			return;
		}

		const updated = await prisma.task.update({
			where: { id },
			data: {
				...(title !== undefined ? { title } : {}),
				...(description !== undefined
					? { description: description ?? null }
					: {}),
				...(dueDate !== undefined
					? { dueDate: dueDate ? new Date(dueDate) : null }
					: {}),
				...(recurrenceType !== undefined ? { recurrenceType } : {}),
				...(categoryId !== undefined ? { categoryId } : {}),
				...(isCompleted !== undefined ? { isCompleted } : {}),
			},
		});

		const dto = toTaskDto(updated);

		sendData(res, 200, dto);
	}),
);

router.delete(
	"/:id",
	requireRole([UserRole.PARENT]),
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const id = Number(req.params.id);

		if (!Number.isFinite(id)) {
			sendError(res, 400, "VALIDATION_ERROR", "Invalid task id");
			return;
		}

		const existing = await prisma.task.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "TASK_NOT_FOUND", "Task not found");
			return;
		}

		await prisma.task.delete({ where: { id } });

		res.status(204).send();
	}),
);

router.use(apiErrorHandler);

export default router;
