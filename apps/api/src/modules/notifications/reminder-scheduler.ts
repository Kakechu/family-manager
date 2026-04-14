import type { PrismaClient } from "@prisma/client";
import {
	createEventReminderNotification,
	createTaskDeadlineNotification,
} from "./task-reminders";

export interface ReminderSchedulerDeps {
	prisma: Pick<
		PrismaClient,
		| "task"
		| "event"
		| "notification"
		| "taskAssignment"
		| "eventAssignment"
		| "user"
	>;
	familyId: number;
	now?: Date;
}

export interface ReminderSchedulerResult {
	createdTaskNotifications: number;
	createdEventNotifications: number;
}

// How far back we still create reminders for overdue items (in minutes).
const TASK_REMINDER_PAST_WINDOW_MINUTES = 60 * 24; // 24 hours
const TASK_REMINDER_DUP_WINDOW_MINUTES = 5; // treat notifications within ±5 minutes as duplicates

const EVENT_REMINDER_LEAD_MINUTES = 60; // default: 1 hour before start
const EVENT_REMINDER_PAST_WINDOW_MINUTES = 60 * 24; // 24 hours
const EVENT_REMINDER_DUP_WINDOW_MINUTES = 5; // treat notifications within ±5 minutes as duplicates

const minutesToMs = (minutes: number): number => minutes * 60 * 1000;

const buildTaskReminderMessage = (
	title: string,
	dueDate: Date,
	now: Date,
): string => {
	const diffMs = now.getTime() - dueDate.getTime();
	const diffMinutes = Math.round(diffMs / 60000);

	if (Math.abs(diffMinutes) < 1) {
		return `Task "${title}" is due now.`;
	}

	if (diffMinutes > 0) {
		return `Task "${title}" was due ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago.`;
	}

	const minutesUntil = Math.abs(diffMinutes);
	return `Task "${title}" is due in ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"}.`;
};

const buildEventReminderMessage = (
	title: string,
	startTime: Date,
	now: Date,
): string => {
	const diffMs = startTime.getTime() - now.getTime();
	const diffMinutes = Math.round(diffMs / 60000);

	if (Math.abs(diffMinutes) < 1) {
		return `Event "${title}" starts now.`;
	}

	if (diffMinutes > 0) {
		return `Event "${title}" starts in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}.`;
	}

	const minutesAgo = Math.abs(diffMinutes);
	return `Event "${title}" started ${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago.`;
};

export const runFamilyReminderScheduler = async ({
	prisma,
	familyId,
	now = new Date(),
}: ReminderSchedulerDeps): Promise<ReminderSchedulerResult> => {
	const nowUtc = now;

	let createdTaskNotifications = 0;
	let createdEventNotifications = 0;

	// --- Task reminders at due time (and for recently overdue tasks) ---
	const taskPastWindowStart = new Date(
		nowUtc.getTime() - minutesToMs(TASK_REMINDER_PAST_WINDOW_MINUTES),
	);

	const candidateTasks = await prisma.task.findMany({
		where: {
			familyId,
			isCompleted: false,
			// Tasks with due dates up to now, but not older than the past window.
			// Recurring tasks are treated the same as non-recurring; dueDate represents
			// the next occurrence when back-end recurrence handling is in place.
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			dueDate: { not: null, lte: nowUtc, gte: taskPastWindowStart },
		},
		select: {
			id: true,
			title: true,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			dueDate: true,
			assignments: {
				select: {
					familyMember: {
						select: { userId: true },
					},
				},
			},
		},
	});

	for (const task of candidateTasks) {
		if (!task.dueDate) continue;

		const reminderTime = task.dueDate;

		// For each assigned family member with a linked user account, ensure a
		// single TASK_REMINDER notification exists for this due date.
		const assignedUserIds = new Set<number>();

		for (const assignment of task.assignments) {
			const userId = assignment.familyMember.userId;
			if (typeof userId === "number") {
				assignedUserIds.add(userId);
			}
		}

		// If there are no explicit assignees with users, fall back to all
		// users in the family. This keeps family-level chores visible while
		// still respecting familyId isolation.
		if (assignedUserIds.size === 0) {
			const familyUsers = await prisma.user.findMany({
				where: { familyId },
				select: { id: true },
			});

			for (const user of familyUsers) {
				assignedUserIds.add(user.id);
			}
		}

		for (const userId of assignedUserIds) {
			const existing = await prisma.notification.findFirst({
				where: {
					type: "TASK_REMINDER",
					userId,
					taskId: task.id,
					createdAt: {
						gte: new Date(
							reminderTime.getTime() -
								minutesToMs(TASK_REMINDER_DUP_WINDOW_MINUTES),
						),
						lte: new Date(
							reminderTime.getTime() +
								minutesToMs(TASK_REMINDER_DUP_WINDOW_MINUTES),
						),
					},
				},
			});

			if (existing) {
				continue;
			}

			await createTaskDeadlineNotification({
				prisma,
				userId,
				taskId: task.id,
				message: buildTaskReminderMessage(task.title, reminderTime, nowUtc),
			});

			createdTaskNotifications += 1;
		}
	}

	// --- Event reminders 1 hour before start (or shortly after for late runs) ---
	const eventWindowStart = new Date(
		nowUtc.getTime() -
			minutesToMs(EVENT_REMINDER_PAST_WINDOW_MINUTES) +
			minutesToMs(EVENT_REMINDER_LEAD_MINUTES),
	);
	const eventWindowEnd = new Date(
		nowUtc.getTime() + minutesToMs(EVENT_REMINDER_LEAD_MINUTES),
	);

	const candidateEvents = await prisma.event.findMany({
		where: {
			familyId,
			startTime: {
				gte: eventWindowStart,
				lte: eventWindowEnd,
			},
		},
		select: {
			id: true,
			title: true,
			startTime: true,
			assignments: {
				select: {
					familyMember: {
						select: { userId: true },
					},
				},
			},
		},
	});

	for (const event of candidateEvents) {
		const reminderTime = new Date(
			event.startTime.getTime() - minutesToMs(EVENT_REMINDER_LEAD_MINUTES),
		);

		// Skip events whose reminder time is still in the future; they will be
		// picked up in a later scheduler run.
		if (reminderTime.getTime() > nowUtc.getTime()) {
			continue;
		}

		const assignedUserIds = new Set<number>();

		for (const assignment of event.assignments) {
			const userId = assignment.familyMember.userId;
			if (typeof userId === "number") {
				assignedUserIds.add(userId);
			}
		}

		if (assignedUserIds.size === 0) {
			const familyUsers = await prisma.user.findMany({
				where: { familyId },
				select: { id: true },
			});

			for (const user of familyUsers) {
				assignedUserIds.add(user.id);
			}
		}

		for (const userId of assignedUserIds) {
			const existing = await prisma.notification.findFirst({
				where: {
					type: "EVENT_REMINDER",
					userId,
					eventId: event.id,
					createdAt: {
						gte: new Date(
							reminderTime.getTime() -
								minutesToMs(EVENT_REMINDER_DUP_WINDOW_MINUTES),
						),
						lte: new Date(
							reminderTime.getTime() +
								minutesToMs(EVENT_REMINDER_DUP_WINDOW_MINUTES),
						),
					},
				},
			});

			if (existing) {
				continue;
			}

			await createEventReminderNotification({
				prisma,
				userId,
				eventId: event.id,
				message: buildEventReminderMessage(
					event.title,
					event.startTime,
					nowUtc,
				),
			});

			createdEventNotifications += 1;
		}
	}

	return {
		createdTaskNotifications,
		createdEventNotifications,
	};
};
