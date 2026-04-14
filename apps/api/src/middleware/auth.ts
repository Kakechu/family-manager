import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { verifyAccessToken } from "../shared/utils/jwt";
import type { AuthContext } from "../shared/types/auth";
import { sendError } from "../shared/http/responses";
import { ACCESS_TOKEN_COOKIE_NAME } from "../shared/constants/auth";

export interface AuthenticatedRequest extends Request {
	auth?: AuthContext;
}

export const authenticate = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	try {
		const token =
			req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] ||
			(typeof req.headers.authorization === "string"
					? req.headers.authorization.replace("Bearer ", "")
					: undefined);

		if (!token) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const payload = verifyAccessToken(token);

		const userIdNumber = Number(payload.sub);

		if (!Number.isFinite(userIdNumber)) {
			sendError(res, 401, "UNAUTHORIZED", "Invalid authentication token");
			return;
		}

		req.auth = {
			userId: userIdNumber,
			familyId: payload.familyId,
			role: payload.role,
		};

		next();
	} catch {
		sendError(res, 401, "UNAUTHORIZED", "Invalid or expired authentication token");
	}
};

export const requireRole = (allowedRoles: UserRole[]) =>
	(req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		if (!allowedRoles.includes(req.auth.role)) {
			sendError(res, 403, "FORBIDDEN", "You are not allowed to perform this action");
			return;
		}

		next();
	};
