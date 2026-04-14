import {
	type AuthUser,
	authUserSchema,
	loginRequestSchema,
	registerRequestSchema,
} from "@family-manager/shared";
import { UserRole } from "@prisma/client";
import { Router } from "express";
import { type AuthenticatedRequest, authenticate } from "../../middleware/auth";
import { ACCESS_TOKEN_COOKIE_NAME } from "../../shared/constants/auth";
import { prisma } from "../../shared/db/client";
import { sendData, sendError } from "../../shared/http/responses";
import { signAccessToken } from "../../shared/utils/jwt";
import { hashPassword, verifyPassword } from "../../shared/utils/password";

const router = Router();

const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

const setAccessTokenCookie = (
	res: Parameters<typeof sendData>[0],
	token: string,
): void => {
	const isProduction = process.env.NODE_ENV === "production";

	res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
		httpOnly: true,
		secure: isProduction,
		sameSite: "strict",
		maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
	});
};

const toAuthUser = (user: {
	id: number;
	email: string;
	role: UserRole;
	familyId: number;
}): AuthUser => {
	const parsed = authUserSchema.parse({
		id: user.id,
		email: user.email,
		role: user.role,
		familyId: user.familyId,
	});

	return parsed;
};

router.post("/register", async (req, res) => {
	const parsed = registerRequestSchema.safeParse(req.body);

	if (!parsed.success) {
		sendError(
			res,
			400,
			"VALIDATION_ERROR",
			"Invalid registration data",
			parsed.error.flatten(),
		);
		return;
	}

	const { email, password, familyName, firstName, lastName } = parsed.data;

	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (existingUser) {
		sendError(
			res,
			409,
			"USER_ALREADY_EXISTS",
			"A user with this email already exists",
		);
		return;
	}

	const passwordHash = await hashPassword(password);

	const { user } = await prisma.$transaction(async (tx) => {
		const family = await tx.family.create({
			data: {
				name: familyName,
			},
		});

		const createdUser = await tx.user.create({
			data: {
				email,
				passwordHash,
				role: UserRole.PARENT,
				familyId: family.id,
			},
		});

		if (firstName && lastName) {
			await tx.familyMember.create({
				data: {
					firstName,
					lastName,
					role: "ADULT",
					familyId: family.id,
					userId: createdUser.id,
				},
			});
		}

		return { user: createdUser };
	});

	const token = signAccessToken({
		userId: user.id,
		familyId: user.familyId,
		role: user.role,
	});

	setAccessTokenCookie(res, token);

	const authUser = toAuthUser(user);

	sendData(res, 201, authUser);
});

router.post("/login", async (req, res) => {
	const parsed = loginRequestSchema.safeParse(req.body);

	if (!parsed.success) {
		sendError(
			res,
			400,
			"VALIDATION_ERROR",
			"Invalid login data",
			parsed.error.flatten(),
		);
		return;
	}

	const { email, password } = parsed.data;

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
		return;
	}

	const passwordMatches = await verifyPassword(password, user.passwordHash);

	if (!passwordMatches) {
		sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
		return;
	}

	const token = signAccessToken({
		userId: user.id,
		familyId: user.familyId,
		role: user.role,
	});

	setAccessTokenCookie(res, token);

	const authUser = toAuthUser(user);

	sendData(res, 200, authUser);
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
	if (!req.auth) {
		sendError(res, 401, "UNAUTHORIZED", "Authentication required");
		return;
	}

	const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });

	if (!user || user.familyId !== req.auth.familyId) {
		sendError(res, 404, "USER_NOT_FOUND", "User not found");
		return;
	}

	const authUser = toAuthUser(user);

	sendData(res, 200, authUser);
});

router.post("/logout", authenticate, (req: AuthenticatedRequest, res) => {
	res.clearCookie(ACCESS_TOKEN_COOKIE_NAME);

	sendData(res, 200, { success: true });
});

export default router;
