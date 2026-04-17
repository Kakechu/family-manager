import {
	type Comment,
	commentSchema,
	createCommentSchema,
	paginationQuerySchema,
} from "@family-manager/shared";
import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { type AuthenticatedRequest, authenticate } from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { asyncHandler } from "../../shared/http/error-handler";
import { buildPaginationMeta, getPaginationArgs } from "../../shared/http/pagination";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = paginationQuerySchema.extend({
	taskId: z.coerce.number().int().positive(),
});

const toCommentDto = (comment: {
	id: number;
	text: string;
	createdAt: Date;
	taskId: number;
	userId: number;
	user?: {
		familyMember?: {
			firstName: string;
			lastName: string;
		} | null;
	} | null;
}): Comment => {
	let authorName: string | undefined;
	if (comment.user?.familyMember) {
		authorName = `${comment.user.familyMember.firstName} ${comment.user.familyMember.lastName}`;
	}

	return commentSchema.parse({
		id: comment.id,
		text: comment.text,
		createdAt: comment.createdAt.toISOString(),
		taskId: comment.taskId,
		userId: comment.userId,
		authorName,
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

		const { page, pageSize, taskId } = parsedQuery.data;

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

		const where = { taskId };
		const totalItems = await prisma.comment.count({ where });
		const comments = await prisma.comment.findMany({
			where,
			orderBy: { createdAt: "asc" },
			include: {
				user: {
					include: {
						familyMember: true,
					},
				},
			},
			...getPaginationArgs({ page, pageSize }),
		});

		const dtos = comments.map(toCommentDto);

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
	asyncHandler(async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsed = createCommentSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid comment data",
				parsed.error.flatten(),
			);
			return;
		}

		const { taskId, text } = parsed.data;

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

		if (req.auth.role !== UserRole.PARENT) {
			const familyMember = await prisma.familyMember.findFirst({
				where: {
					userId: req.auth.userId,
					familyId: req.auth.familyId,
				},
				select: {
					id: true,
				},
			});

			if (!familyMember) {
				sendError(
					res,
					403,
					"FORBIDDEN",
					"Only parents or task assignees can comment on this task",
				);
				return;
			}

			const assignment = await prisma.taskAssignment.findFirst({
				where: {
					taskId,
					familyMemberId: familyMember.id,
				},
				select: {
					taskId: true,
				},
			});

			if (!assignment) {
				sendError(
					res,
					403,
					"FORBIDDEN",
					"Only parents or task assignees can comment on this task",
				);
				return;
			}
		}

		const created = await prisma.comment.create({
			data: {
				text,
				taskId,
				userId: req.auth.userId,
			},
			include: {
				user: {
					include: {
						familyMember: true,
					},
				},
			},
		});

		const dto = toCommentDto(created);

		sendData(res, 201, dto);
	}),
);

export default router;
