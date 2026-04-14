import type {
	AddTaskAssignmentsRequestDto,
	TaskAssignmentDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListTaskAssignmentsResponse {
	data: TaskAssignmentDto[];
}

export const listTaskAssignments = async (
	taskId: number,
): Promise<ListTaskAssignmentsResponse> => {
	const response = await apiClient.get<ListTaskAssignmentsResponse>(
		"/task-assignments",
		{
			params: { taskId },
		},
	);
	return response.data;
};

export interface AddTaskAssignmentsResponse {
	data: TaskAssignmentDto[];
}

export const addTaskAssignments = async (
	payload: AddTaskAssignmentsRequestDto,
): Promise<AddTaskAssignmentsResponse> => {
	const response = await apiClient.post<AddTaskAssignmentsResponse>(
		"/task-assignments",
		payload,
	);
	return response.data;
};

export const deleteTaskAssignment = async (
	taskId: number,
	familyMemberId: number,
): Promise<void> => {
	await apiClient.delete(`/task-assignments/${taskId}/${familyMemberId}`);
};
