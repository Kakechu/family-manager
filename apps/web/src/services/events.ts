import type {
	CreateEventRequestDto,
	EventDto,
	UpdateEventRequestDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListEventsParams {
	from?: string;
	to?: string;
	familyMemberId?: number;
	categoryId?: number;
	includeUnassigned?: boolean;
}

export interface ListEventsResponse {
	data: EventDto[];
}

export const listEvents = async (
	params: ListEventsParams = {},
): Promise<ListEventsResponse> => {
	const response = await apiClient.get<ListEventsResponse>("/events", {
		params,
	});
	return response.data;
};

export interface EventResponse {
	data: EventDto;
}

export const createEvent = async (
	payload: CreateEventRequestDto,
): Promise<EventResponse> => {
	const response = await apiClient.post<EventResponse>("/events", payload);
	return response.data;
};

export const updateEvent = async (
	id: number,
	payload: UpdateEventRequestDto,
): Promise<EventResponse> => {
	const response = await apiClient.patch<EventResponse>(
		`/events/${id}`,
		payload,
	);
	return response.data;
};

export const deleteEvent = async (id: number): Promise<void> => {
	await apiClient.delete(`/events/${id}`);
};
