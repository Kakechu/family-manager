export type NotificationType = "TASK_REMINDER" | "EVENT_REMINDER" | "OTHER";

export interface NotificationDto {
	id: number;
	message: string;
	type: NotificationType;
	isRead: boolean;
	createdAt: string;
	userId: number;
	taskId?: number | null;
	eventId?: number | null;
}
