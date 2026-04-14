import type {
	CreateTaskRequestDto,
	TaskDto,
	UpdateTaskRequestDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListTasksParams {
	familyMemberId?: number;
	categoryId?: number;
	isCompleted?: boolean;
}

export interface ListTasksResponse {
	data: TaskDto[];
}

export const listTasks = async (
	params: ListTasksParams = {},
): Promise<ListTasksResponse> => {
	const response = await apiClient.get<ListTasksResponse>("/tasks", {
		params,
	});
	return response.data;
};

export interface TaskResponse {
	data: TaskDto;
}

export const getTask = async (id: number): Promise<TaskResponse> => {
	const response = await apiClient.get<TaskResponse>(`/tasks/${id}`);
	return response.data;
};

export const createTask = async (
	payload: CreateTaskRequestDto,
): Promise<TaskResponse> => {
	const response = await apiClient.post<TaskResponse>("/tasks", payload);
	return response.data;
};

export const updateTask = async (
	id: number,
	payload: UpdateTaskRequestDto,
): Promise<TaskResponse> => {
	const response = await apiClient.patch<TaskResponse>(`/tasks/${id}`, payload);
	return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
	await apiClient.delete(`/tasks/${id}`);
};
