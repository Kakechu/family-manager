import type {
	AddEventAssignmentsRequestDto,
	EventAssignmentDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListEventAssignmentsResponse {
	data: EventAssignmentDto[];
}

export const listEventAssignments = async (
	eventId: number,
): Promise<ListEventAssignmentsResponse> => {
	const response = await apiClient.get<ListEventAssignmentsResponse>(
		"/event-assignments",
		{ params: { eventId } },
	);
	return response.data;
};

export const addEventAssignments = async (
	payload: AddEventAssignmentsRequestDto,
): Promise<ListEventAssignmentsResponse> => {
	const response = await apiClient.post<ListEventAssignmentsResponse>(
		"/event-assignments",
		payload,
	);
	return response.data;
};

export const deleteEventAssignment = async (
	eventId: number,
	familyMemberId: number,
): Promise<void> => {
	await apiClient.delete(`/event-assignments/${eventId}/${familyMemberId}`);
};
