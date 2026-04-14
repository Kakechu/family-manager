import type { UserRole } from "@prisma/client";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

interface JwtPayload {
	sub: string;
	familyId: number;
	role: UserRole;
}

const JWT_SECRET: Secret = process.env.AUTH_JWT_SECRET ?? "dev-secret";
const JWT_EXPIRES_IN = process.env.AUTH_JWT_EXPIRES_IN ?? "15m";

export const signAccessToken = (params: {
	userId: number;
	familyId: number;
	role: UserRole;
}): string => {
	const payload: JwtPayload = {
		sub: String(params.userId),
		familyId: params.familyId,
		role: params.role,
	};

	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
		subject: String(params.userId),
	});
};

export const verifyAccessToken = (token: string): JwtPayload => {
	return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
