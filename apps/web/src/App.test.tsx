import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getCurrentUser } from "./services/auth";
import {
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "./services/notifications";

vi.mock("./services/auth", () => ({
	getCurrentUser: vi.fn(),
	logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./services/notifications", () => ({
	listNotifications: vi.fn(),
	markNotificationRead: vi.fn(),
	markAllNotificationsRead: vi.fn(),
	isMissingEndpointError: (error: unknown) =>
		(error as { response?: { status?: number } })?.response?.status === 404,
}));

vi.mock("./features/calendar/CalendarPage", () => ({
	CalendarPage: () => <div>Calendar Page</div>,
}));

vi.mock("./features/tasks/TasksPage", () => ({
	TasksPage: () => <div>Tasks Page</div>,
}));

vi.mock("./features/family-members/FamilyMembersPage", () => ({
	FamilyMembersPage: () => <div>Family Members Page</div>,
}));

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue({
			id: 1,
			email: "parent@example.com",
			role: "PARENT",
			familyId: 1,
		});
		vi.mocked(listNotifications).mockResolvedValue({
			data: [
				{
					id: 1,
					message: "Task reminder",
					type: "TASK_REMINDER",
					isRead: false,
					createdAt: "2026-04-16T08:00:00.000Z",
					userId: 1,
					taskId: 11,
					eventId: null,
				},
				{
					id: 2,
					message: "Event reminder",
					type: "EVENT_REMINDER",
					isRead: false,
					createdAt: "2026-04-15T08:00:00.000Z",
					userId: 1,
					taskId: null,
					eventId: 22,
				},
			],
		});
		vi.mocked(markNotificationRead).mockResolvedValue({
			data: {
				id: 1,
				message: "Task reminder",
				type: "TASK_REMINDER",
				isRead: true,
				createdAt: "2026-04-16T08:00:00.000Z",
				userId: 1,
				taskId: 11,
				eventId: null,
			},
		});
		vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined);
	});

	it("shows notifications entry and unread count loaded from backend state", async () => {
		render(
			<React.StrictMode>
				<App />
			</React.StrictMode>,
		);

		const notificationsButton = await screen.findByRole("button", {
			name: /Notifications/i,
		});
		fireEvent.click(notificationsButton);

		expect(
			await screen.findByText(/2 unread notifications/i),
		).toBeInTheDocument();
	});

	it("marks a single notification as read and updates the unread count", async () => {
		render(
			<React.StrictMode>
				<App />
			</React.StrictMode>,
		);

		const notificationsButton = await screen.findByRole("button", {
			name: /Notifications/i,
		});
		fireEvent.click(notificationsButton);

		expect(
			await screen.findByText(/2 unread notifications/i),
		).toBeInTheDocument();

		const markReadButtons = screen.getAllByRole("button", {
			name: /Mark as read/i,
		});
		fireEvent.click(markReadButtons[0]);

		await waitFor(() => {
			expect(markNotificationRead).toHaveBeenCalledWith(1);
		});

		expect(
			await screen.findByText(/1 unread notification/i),
		).toBeInTheDocument();
	});

	it("falls back to per-item mark read when mark-all endpoint is missing", async () => {
		vi.mocked(markAllNotificationsRead).mockRejectedValueOnce({
			response: {
				status: 404,
			},
		});

		render(
			<React.StrictMode>
				<App />
			</React.StrictMode>,
		);

		const notificationsButton = await screen.findByRole("button", {
			name: /Notifications/i,
		});
		fireEvent.click(notificationsButton);

		fireEvent.click(
			await screen.findByRole("button", { name: /Mark all as read/i }),
		);

		await waitFor(() => {
			expect(markNotificationRead).toHaveBeenCalledTimes(2);
		});

		expect(
			await screen.findByText(
				/Mark-all endpoint is unavailable, so notifications were marked read one by one/i,
			),
		).toBeInTheDocument();
	});
});
