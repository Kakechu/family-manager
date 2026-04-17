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
	notification: {},
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

		(
			createTaskDeadlineNotification as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });
		(
			createEventReminderNotification as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });
	});

	it("creates task reminders for due tasks", async () => {
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
				reminderKey: "task:1:user:10:slot:2026-04-14T11:59:00.000Z",
				message: 'Task "Empty dishwasher" was due 1 minute ago.',
			}),
		);

		expect(result.createdTaskNotifications).toBe(1);
		expect(result.createdEventNotifications).toBe(0);
	});

	it("does not count duplicate task reminders when insert is idempotently skipped", async () => {
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
			createTaskDeadlineNotification as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(null);

		const result = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		expect(createTaskDeadlineNotification).toHaveBeenCalledTimes(1);
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
				reminderKey: "event:3:user:30:slot:2026-04-14T12:00:00.000Z",
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

	it("keeps task reminders idempotent across delayed and retried runs", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");
		const delayedNow = new Date("2026-04-14T12:15:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 8,
				title: "Laundry",
				dueDate: new Date("2026-04-14T11:59:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 500 },
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

		(createTaskDeadlineNotification as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: 1 })
			.mockResolvedValueOnce(null);

		const firstResult = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		const secondResult = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now: delayedNow,
		});

		expect(firstResult.createdTaskNotifications).toBe(1);
		expect(secondResult.createdTaskNotifications).toBe(0);

		const createCalls = (
			createTaskDeadlineNotification as unknown as ReturnType<typeof vi.fn>
		).mock.calls;
		expect(createCalls).toHaveLength(2);
		expect(createCalls[0][0].reminderKey).toBe(createCalls[1][0].reminderKey);
		expect(createCalls[0][0].reminderKey).toBe(
			"task:8:user:500:slot:2026-04-14T11:59:00.000Z",
		);
	});

	it("keeps event reminders idempotent across delayed and retried runs", async () => {
		const now = new Date("2026-04-14T12:00:00.000Z");
		const delayedNow = new Date("2026-04-14T12:20:00.000Z");

		(
			prismaMock.task.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(
			prismaMock.event.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 9,
				title: "Piano class",
				startTime: new Date("2026-04-14T13:00:00.000Z"),
				assignments: [
					{
						familyMember: { userId: 900 },
					},
				],
			},
		]);

		(
			prismaMock.user.findMany as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		(createEventReminderNotification as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ id: 1 })
			.mockResolvedValueOnce(null);

		const firstResult = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now,
		});

		const secondResult = await runFamilyReminderScheduler({
			prisma: asAnyPrisma,
			familyId: 10,
			now: delayedNow,
		});

		expect(firstResult.createdEventNotifications).toBe(1);
		expect(secondResult.createdEventNotifications).toBe(0);

		const createCalls = (
			createEventReminderNotification as unknown as ReturnType<typeof vi.fn>
		).mock.calls;
		expect(createCalls).toHaveLength(2);
		expect(createCalls[0][0].reminderKey).toBe(createCalls[1][0].reminderKey);
		expect(createCalls[0][0].reminderKey).toBe(
			"event:9:user:900:slot:2026-04-14T12:00:00.000Z",
		);
	});
});
