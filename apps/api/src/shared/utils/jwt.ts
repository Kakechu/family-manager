import type { UserRole } from "@prisma/client";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

interface JwtPayload {
	sub: string;
	familyId: number;
	role: UserRole;
}

const getJwtSecret = (): Secret => {
	const configuredSecret = process.env.AUTH_JWT_SECRET?.trim();

	if (configuredSecret) {
		return configuredSecret;
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error("AUTH_JWT_SECRET must be configured in production");
	}

	return "dev-secret";
};

const JWT_SECRET: Secret = getJwtSecret();
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
	});
};

export const verifyAccessToken = (token: string): JwtPayload => {
	return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
