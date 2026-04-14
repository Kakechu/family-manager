import { describe, expect, it, vi } from "vitest";
import { createTaskDeadlineNotification } from "./task-reminders";

describe("createTaskDeadlineNotification", () => {
	it("creates a TASK_REMINDER notification using the provided prisma client", async () => {
		const createMock = vi.fn().mockResolvedValue({
			id: 1,
			message: "Reminder: task is due soon",
			type: "TASK_REMINDER",
			isRead: false,
			createdAt: new Date("2026-04-14T10:00:00.000Z"),
			userId: 10,
			taskId: 20,
			eventId: null,
		});

		const prisma = {
			notification: {
				create: createMock,
			},
		} as const;

		const result = await createTaskDeadlineNotification({
			prisma,
			userId: 10,
			taskId: 20,
			message: "Reminder: task is due soon",
		});

		expect(createMock).toHaveBeenCalledWith({
			data: {
				message: "Reminder: task is due soon",
				type: "TASK_REMINDER",
				userId: 10,
				taskId: 20,
			},
		});

		expect(result).toMatchObject({
			id: 1,
			message: "Reminder: task is due soon",
			type: "TASK_REMINDER",
			userId: 10,
			taskId: 20,
		});
	});
});
