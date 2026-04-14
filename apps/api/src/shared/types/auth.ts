import type { UserRole } from "@prisma/client";

export interface AuthContext {
	userId: number;
	familyId: number;
	role: UserRole;
}
