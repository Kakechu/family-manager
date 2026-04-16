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
				message: 'Task "Empty dishwasher" was due 1 minute ago.',
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
				message: 'Event "Doctor appointment" starts in 60 minutes.',
			}),
		);

		expect(result.createdEventNotifications).toBe(1);
		expect(result.createdTaskNotifications).toBe(0);
	});

	it("uses a 24-hour window for task reminders and does not schedule for older tasks", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(prismaMock.task.findMany).toHaveBeenCalledTimes(1);
		const taskArgs = (
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		const dueDateFilter = taskArgs.where.dueDate;

		// We expect a 24 hour window ending at "now".
		expect(dueDateFilter.lte).toEqual(now);
		const windowMs = now.getTime() - (dueDateFilter.gte as Date).getTime();
		expect(windowMs).toBe(60 * 24 * 60 * 1000);
	});

	it("uses the configured lead and past window for event reminders", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(prismaMock.event.findMany).toHaveBeenCalledTimes(1);
		const eventArgs = (
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mock.calls[0][0];
		const startTimeFilter = eventArgs.where.startTime;

		// Lead time is 60 minutes and past window is 24 hours.
		const expectedWindowStart =
			now.getTime() - 60 * 24 * 60 * 1000 + 60 * 60 * 1000;
		const expectedWindowEnd = now.getTime() + 60 * 60 * 1000;

		expect((startTimeFilter.gte as Date).getTime()).toBe(expectedWindowStart);
		expect((startTimeFilter.lte as Date).getTime()).toBe(expectedWindowEnd);
	});

	it("falls back to all family users when a task has no assigned users", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 4,
				title: "Shared chore",
				// due at current time
				dueDate: new Date("2026-04-14T12:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: null },
					},
				],
			},
		]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([{ id: 100 }, { id: 101 }]);

		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createTaskDeadlineNotification).toHaveBeenCalledTimes(2);
		expect(createTaskDeadlineNotification).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 100, taskId: 4 }),
		);
		expect(createTaskDeadlineNotification).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 101, taskId: 4 }),
		);
		expect(result.createdTaskNotifications).toBe(2);
	});

	it("falls back to all family users when an event has no assigned users", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 5,
				title: "Family event",
				// starts in 60 minutes so reminder should run now
				startTime: new Date("2026-04-14T13:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: null },
					},
				],
			},
		]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([{ id: 200 }, { id: 201 }]);

		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createEventReminderNotification).toHaveBeenCalledTimes(2);
		expect(createEventReminderNotification).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 200, eventId: 5 }),
		);
		expect(createEventReminderNotification).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 201, eventId: 5 }),
		);
		expect(result.createdEventNotifications).toBe(2);
	});

	it('creates a "due now" task reminder when due date matches the current time', async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 6,
				title: "Finish homework",
				// due at current time
				dueDate: new Date("2026-04-14T12:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 300 },
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

		await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createTaskDeadlineNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 300,
				taskId: 6,
				message: 'Task "Finish homework" is due now.',
			}),
		);
	});

	it('creates a "starts now" event reminder when scheduler runs at event start time', async () => {
		const now = new Date("2026-04-14T13:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 7,
				title: "Math exam",
				// starts at current time
				startTime: new Date("2026-04-14T13:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 400 },
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

		await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createEventReminderNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 400,
				eventId: 7,
				message: 'Event "Math exam" starts now.',
			}),
		);
	});

	it("does not create duplicate event reminders within the duplicate window", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 8,
				title: "Dance practice",
				// starts in exactly 60 minutes
				startTime: new Date("2026-04-14T13:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 500 },
					},
				],
			},
		]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		// Simulate existing reminder within the duplicate window
		(
			prismaMock.notification.findFirst as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 123 });

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createEventReminderNotification).not.toHaveBeenCalled();
		expect(result.createdEventNotifications).toBe(0);
	});
});
