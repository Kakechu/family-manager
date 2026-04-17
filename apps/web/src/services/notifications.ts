import type { NotificationDto, NotificationType } from "@family-manager/shared";
import axios from "axios";
import { apiClient } from "./apiClient";

export interface ListNotificationsParams {
	isRead?: boolean;
	type?: NotificationType;
}

export interface ListNotificationsResponse {
	data: NotificationDto[];
}

export interface NotificationResponse {
	data: NotificationDto;
}

export interface RunReminderSchedulerResponse {
	data: {
		createdTaskNotifications: number;
		createdEventNotifications: number;
	};
}

export const listNotifications = async (
	params: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> => {
	const response = await apiClient.get<ListNotificationsResponse>(
		"/notifications",
		{
			params,
		},
	);
	return response.data;
};

export const markNotificationRead = async (
	id: number,
): Promise<NotificationResponse> => {
	const response = await apiClient.patch<NotificationResponse>(
		`/notifications/${id}/read`,
	);
	return response.data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
	await apiClient.post("/notifications/mark-all-read");
};

export const runReminderScheduler = async (): Promise<RunReminderSchedulerResponse> => {
	const response = await apiClient.post<RunReminderSchedulerResponse>(
		"/notifications/reminders/run",
	);
	return response.data;
};

export const isMissingEndpointError = (error: unknown): boolean => {
	return axios.isAxiosError(error) && error.response?.status === 404;
};
