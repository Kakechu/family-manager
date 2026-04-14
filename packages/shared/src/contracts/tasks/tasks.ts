export type TaskRecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface TaskDto {
	id: number;
	title: string;
	description?: string | null;
	/** ISO-8601 string in UTC, or null when not set */
	dueDate?: string | null;
	isCompleted: boolean;
	recurrenceType: TaskRecurrenceType;
	categoryId: number;
	createdBy: number;
	familyId: number;
}

export interface CreateTaskRequestDto {
	title: string;
	description?: string | null;
	/** ISO-8601 string in UTC, interpreted as due date */
	dueDate?: string | null;
	recurrenceType: TaskRecurrenceType;
	categoryId: number;
}

export interface UpdateTaskRequestDto {
	title?: string;
	description?: string | null;
	/** ISO-8601 string in UTC, interpreted as due date */
	dueDate?: string | null;
	recurrenceType?: TaskRecurrenceType;
	categoryId?: number;
	isCompleted?: boolean;
}
