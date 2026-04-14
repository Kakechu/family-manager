export type FamilyMemberRole = "ADULT" | "CHILD";

export interface FamilyMemberDto {
	id: number;
	firstName: string;
	lastName: string;
	dateOfBirth?: string | null;
	role: FamilyMemberRole;
	familyId: number;
	userId?: number | null;
}

export interface CreateFamilyMemberRequestDto {
	firstName: string;
	lastName: string;
	dateOfBirth?: string | null;
	role: FamilyMemberRole;
	userId?: number | null;
}

export interface UpdateFamilyMemberRequestDto {
	firstName?: string;
	lastName?: string;
	dateOfBirth?: string | null;
	role?: FamilyMemberRole;
	userId?: number | null;
}
