export type UserRole = "PARENT" | "CHILD";

export interface AuthUserDto {
	id: number;
	email: string;
	role: UserRole;
	familyId: number;
}

export interface LoginRequestDto {
	email: string;
	password: string;
}

export interface RegisterRequestDto {
	email: string;
	password: string;
	familyName: string;
	firstName?: string;
	lastName?: string;
}
