import {
	type Comment,
	commentSchema,
	createCommentSchema,
} from "@family-manager/shared";
import { Router } from "express";
import { z } from "zod";
import { type AuthenticatedRequest, authenticate } from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { sendData, sendError, sendList } from "../../shared/http/responses";

const router = Router();

const querySchema = z.object({
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
		email: string;
	} | null;
}): Comment => {
	let authorName: string | undefined;
	if (comment.user?.familyMember) {
		authorName = `${comment.user.familyMember.firstName} ${comment.user.familyMember.lastName}`;
	} else if (comment.user?.email) {
		authorName = comment.user.email.split("@")[0];
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

	const comments = await prisma.comment.findMany({
		where: { taskId },
		orderBy: { createdAt: "asc" },
		include: {
			user: {
				include: {
					familyMember: true,
				},
			},
		},
	});

	const dtos = comments.map(toCommentDto);

	sendList(res, 200, dtos);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
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

	const created = await prisma.comment.create({
		data: {
			text,
			taskId,
			userId: req.auth.userId,
		},
	});

	const dto = toCommentDto(created);

	sendData(res, 201, dto);
});

export default router;
