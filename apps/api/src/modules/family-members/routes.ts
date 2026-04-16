import {
	type FamilyMember,
	createFamilyMemberSchema,
	familyMemberRoleSchema,
	familyMemberSchema,
	updateFamilyMemberSchema,
} from "@family-manager/shared";
import { type FamilyMemberRole, UserRole } from "@prisma/client";
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
	role: familyMemberRoleSchema.optional(),
});

const validateLinkedUserForFamilyMember = async (params: {
	userId: number;
	familyId: number;
	excludeFamilyMemberId?: number;
}): Promise<string | null> => {
	const user = await prisma.user.findUnique({
		where: { id: params.userId },
		select: { id: true, familyId: true },
	});

	if (!user || user.familyId !== params.familyId) {
		return "Linked user must belong to the current family";
	}

	const linkedFamilyMember = await prisma.familyMember.findFirst({
		where: {
			userId: params.userId,
			...(params.excludeFamilyMemberId
				? { id: { not: params.excludeFamilyMemberId } }
				: {}),
		},
		select: { id: true },
	});

	if (linkedFamilyMember) {
		return "Linked user is already associated with another family member";
	}

	return null;
};

const toFamilyMemberDto = (member: {
	id: number;
	firstName: string;
	lastName: string;
	dateOfBirth: Date | null;
	role: FamilyMemberRole;
	familyId: number;
	userId: number | null;
}): FamilyMember => {
	return familyMemberSchema.parse({
		id: member.id,
		firstName: member.firstName,
		lastName: member.lastName,
		dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString() : null,
		role: member.role,
		familyId: member.familyId,
		userId: member.userId,
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

	const { role } = parsedQuery.data;

	const members = await prisma.familyMember.findMany({
		where: {
			familyId: req.auth.familyId,
			...(role ? { role } : {}),
		},
		orderBy: { id: "asc" },
	});

	const dtos = members.map(toFamilyMemberDto);

	sendList(res, 200, dtos);
});

router.post(
	"/",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const parsed = createFamilyMemberSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid family member data",
				parsed.error.flatten(),
			);
			return;
		}

		const { firstName, lastName, dateOfBirth, role, userId } = parsed.data;

		if (typeof userId === "number") {
			const validationError = await validateLinkedUserForFamilyMember({
				userId,
				familyId: req.auth.familyId,
			});

			if (validationError) {
				sendError(res, 400, "VALIDATION_ERROR", validationError);
				return;
			}
		}

		const created = await prisma.familyMember.create({
			data: {
				firstName,
				lastName,
				dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
				role,
				familyId: req.auth.familyId,
				userId: userId ?? null,
			},
		});

		const dto = toFamilyMemberDto(created);

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
			sendError(res, 400, "VALIDATION_ERROR", "Invalid family member id");
			return;
		}

		const parsed = updateFamilyMemberSchema.safeParse(req.body);

		if (!parsed.success) {
			sendError(
				res,
				400,
				"VALIDATION_ERROR",
				"Invalid family member data",
				parsed.error.flatten(),
			);
			return;
		}

		const existing = await prisma.familyMember.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "FAMILY_MEMBER_NOT_FOUND", "Family member not found");
			return;
		}

		const { firstName, lastName, dateOfBirth, role, userId } = parsed.data;

		if (typeof userId === "number") {
			const validationError = await validateLinkedUserForFamilyMember({
				userId,
				familyId: req.auth.familyId,
				excludeFamilyMemberId: id,
			});

			if (validationError) {
				sendError(res, 400, "VALIDATION_ERROR", validationError);
				return;
			}
		}

		const updated = await prisma.familyMember.update({
			where: { id },
			data: {
				...(firstName !== undefined ? { firstName } : {}),
				...(lastName !== undefined ? { lastName } : {}),
				...(dateOfBirth !== undefined
					? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
					: {}),
				...(role !== undefined ? { role } : {}),
				...(userId !== undefined ? { userId: userId ?? null } : {}),
			},
		});

		const dto = toFamilyMemberDto(updated);

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
			sendError(res, 400, "VALIDATION_ERROR", "Invalid family member id");
			return;
		}

		const existing = await prisma.familyMember.findFirst({
			where: {
				id,
				familyId: req.auth.familyId,
			},
		});

		if (!existing) {
			sendError(res, 404, "FAMILY_MEMBER_NOT_FOUND", "Family member not found");
			return;
		}

		await prisma.familyMember.delete({ where: { id } });

		res.status(204).send();
	},
);

export default router;
