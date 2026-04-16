import type { NotificationDto } from "@family-manager/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./NotificationsPage";

const sampleNotifications: NotificationDto[] = [
	{
		id: 1,
		message: "Task reminder: Take out trash",
		type: "TASK_REMINDER",
		isRead: false,
		createdAt: "2026-04-16T08:00:00.000Z",
		userId: 1,
		taskId: 10,
		eventId: null,
	},
	{
		id: 2,
		message: "Event reminder: School meeting",
		type: "EVENT_REMINDER",
		isRead: true,
		createdAt: "2026-04-15T08:00:00.000Z",
		userId: 1,
		taskId: null,
		eventId: 15,
	},
];

describe("NotificationsPage", () => {
	it("renders loading state", () => {
		render(
			<NotificationsPage
				notifications={[]}
				loading
				markingAllRead={false}
				markingReadIds={[]}
				onRefresh={vi.fn()}
				onMarkRead={vi.fn()}
				onMarkAllRead={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText(/Loading notifications/i)).toBeInTheDocument();
	});

	it("renders empty state", () => {
		render(
			<NotificationsPage
				notifications={[]}
				loading={false}
				markingAllRead={false}
				markingReadIds={[]}
				onRefresh={vi.fn()}
				onMarkRead={vi.fn()}
				onMarkAllRead={vi.fn()}
			/>,
		);

		expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
	});

	it("renders error state and retry action", () => {
		const onRefresh = vi.fn();

		render(
			<NotificationsPage
				notifications={[]}
				loading={false}
				error="Failed to load notifications"
				markingAllRead={false}
				markingReadIds={[]}
				onRefresh={onRefresh}
				onMarkRead={vi.fn()}
				onMarkAllRead={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it("renders unread and read states and handles mark actions", () => {
		const onMarkRead = vi.fn().mockResolvedValue(undefined);
		const onMarkAllRead = vi.fn().mockResolvedValue(undefined);

		render(
			<NotificationsPage
				notifications={sampleNotifications}
				loading={false}
				markingAllRead={false}
				markingReadIds={[]}
				onRefresh={vi.fn()}
				onMarkRead={onMarkRead}
				onMarkAllRead={onMarkAllRead}
			/>,
		);

		expect(
			screen.getByText(/2 unread notifications|1 unread notification/i),
		).toBeInTheDocument();
		expect(screen.getAllByText(/Unread|Read/i).length).toBeGreaterThanOrEqual(
			2,
		);

		fireEvent.click(screen.getByRole("button", { name: /Mark all as read/i }));
		expect(onMarkAllRead).toHaveBeenCalledTimes(1);

		const markReadButtons = screen.getAllByRole("button", {
			name: /Mark as read/i,
		});
		fireEvent.click(markReadButtons[0]);
		expect(onMarkRead).toHaveBeenCalledWith(1);
	});
});
