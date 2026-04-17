import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
	createEventReminderNotification,
	createTaskDeadlineNotification,
} from "./task-reminders";

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
		} as unknown as Pick<PrismaClient, "notification">;

		const result = await createTaskDeadlineNotification({
			prisma,
			userId: 10,
			taskId: 20,
			reminderKey: "task:20:user:10:slot:2026-04-14T10:00:00.000Z",
			message: "Reminder: task is due soon",
		});

		expect(createMock).toHaveBeenCalledWith({
			data: {
				message: "Reminder: task is due soon",
				type: "TASK_REMINDER",
				userId: 10,
				taskId: 20,
					reminderKey: "task:20:user:10:slot:2026-04-14T10:00:00.000Z",
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

	it("returns null when reminder insert hits unique key conflict", async () => {
		const createMock = vi.fn().mockRejectedValue({ code: "P2002" });

		const prisma = {
			notification: {
				create: createMock,
			},
		} as unknown as Pick<PrismaClient, "notification">;

		const result = await createTaskDeadlineNotification({
			prisma,
			userId: 10,
			taskId: 20,
			reminderKey: "task:20:user:10:slot:2026-04-14T10:00:00.000Z",
			message: "Reminder: task is due soon",
		});

		expect(result).toBeNull();
	});
});

describe("createEventReminderNotification", () => {
	it("creates an EVENT_REMINDER notification using the provided prisma client", async () => {
		const createMock = vi.fn().mockResolvedValue({
			id: 2,
			message: "Reminder: event starts soon",
			type: "EVENT_REMINDER",
			isRead: false,
			createdAt: new Date("2026-04-14T11:00:00.000Z"),
			userId: 11,
			askId: null,
			eventId: 30,
		});

		const prisma = {
			notification: {
				create: createMock,
			},
		} as unknown as Pick<PrismaClient, "notification">;

		const result = await createEventReminderNotification({
			prisma,
			userId: 11,
			eventId: 30,
			reminderKey: "event:30:user:11:slot:2026-04-14T10:00:00.000Z",
			message: "Reminder: event starts soon",
		});

		expect(createMock).toHaveBeenCalledWith({
			data: {
				message: "Reminder: event starts soon",
				type: "EVENT_REMINDER",
				userId: 11,
				eventId: 30,
				reminderKey: "event:30:user:11:slot:2026-04-14T10:00:00.000Z",
			},
		});

		expect(result).toMatchObject({
			id: 2,
			message: "Reminder: event starts soon",
			type: "EVENT_REMINDER",
			userId: 11,
			eventId: 30,
		});
	});

	it("returns null when event reminder insert hits unique key conflict", async () => {
		const createMock = vi.fn().mockRejectedValue({ code: "P2002" });

		const prisma = {
			notification: {
				create: createMock,
			},
		} as unknown as Pick<PrismaClient, "notification">;

		const result = await createEventReminderNotification({
			prisma,
			userId: 11,
			eventId: 30,
			reminderKey: "event:30:user:11:slot:2026-04-14T10:00:00.000Z",
			message: "Reminder: event starts soon",
		});

		expect(result).toBeNull();
	});
});
