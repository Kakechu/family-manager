import type { AuthUser } from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface LoginRequest {
	email: string;
	password: string;
}

export interface AuthResponse {
	data: AuthUser;
}

export const login = async (payload: LoginRequest): Promise<AuthUser> => {
	const response = await apiClient.post<AuthResponse>("/auth/login", payload);
	return response.data.data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
	const response = await apiClient.get<AuthResponse>("/auth/me");
	return response.data.data;
};
