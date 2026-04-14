import { beforeEach, describe, expect, it, vi } from "vitest";
import { runFamilyReminderScheduler } from "./reminder-scheduler";
import {
	createEventReminderNotification,
	createTaskDeadlineNotification,
} from "./task-reminders";

vi.mock("./task-reminders", () => {
	return {
		createTaskDeadlineNotification: vi.fn(),
		createEventReminderNotification: vi.fn(),
	};
});

const prismaMock = {
	task: {
		findMany: vi.fn(),
	},
	event: {
		findMany: vi.fn(),
	},
	notification: {
		findFirst: vi.fn(),
	},
	user: {
		findMany: vi.fn(),
	},
} as const;

const asAnyPrisma = prismaMock as unknown as Parameters<
	typeof runFamilyReminderScheduler
>[0]["prisma"];

describe("runFamilyReminderScheduler", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("creates task reminders for due tasks without existing notifications", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 1,
				title: "Empty dishwasher",
				// due one minute ago
				dueDate: new Date("2026-04-14T11:59:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 10 },
					},
				],
			},
		]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createTaskDeadlineNotification).toHaveBeenCalledTimes(1);
		expect(createTaskDeadlineNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 10,
				taskId: 1,
			}),
		);

		expect(result.createdTaskNotifications).toBe(1);
		expect(result.createdEventNotifications).toBe(0);
	});

	it("does not create duplicate task reminders when a notification already exists", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 2,
				title: "Pay rent",
				// due at current time
				dueDate: new Date("2026-04-14T12:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 20 },
					},
				],
			},
		]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 999,
		});

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createTaskDeadlineNotification).not.toHaveBeenCalled();
		expect(result.createdTaskNotifications).toBe(0);
	});

	it("creates event reminders 1 hour before start for assigned users", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 3,
				title: "Doctor appointment",
				// starts in exactly 60 minutes
				startTime: new Date("2026-04-14T13:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 30 },
					},
				],
			},
		]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createEventReminderNotification).toHaveBeenCalledTimes(1);
		expect(createEventReminderNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 30,
				eventId: 3,
			}),
		);

		expect(result.createdEventNotifications).toBe(1);
		expect(result.createdTaskNotifications).toBe(0);
	});
});
