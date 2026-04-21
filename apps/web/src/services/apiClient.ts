import axios from "axios";

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
	withCredentials: true,
});

export interface ApiError {
	code: string;
	message: string;
	details?: unknown;
}

export const isApiError = (error: unknown): error is ApiError => {
	if (!error || typeof error !== "object") {
		return false;
	}

	const maybe = error as { code?: unknown; message?: unknown };
	return typeof maybe.code === "string" && typeof maybe.message === "string";
};
