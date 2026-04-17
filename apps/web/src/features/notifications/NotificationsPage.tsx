import type { NotificationDto } from "@family-manager/shared";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Container,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import type React from "react";

interface NotificationsPageProps {
	notifications: NotificationDto[];
	loading: boolean;
	error?: string;
	fallbackMessage?: string;
	markingAllRead: boolean;
	markingReadIds: number[];
	onRefresh: () => void;
	onMarkRead: (id: number) => Promise<void>;
	onMarkAllRead: () => Promise<void>;
}

const notificationTypeLabel: Record<NotificationDto["type"], string> = {
	TASK_REMINDER: "Task reminder",
	EVENT_REMINDER: "Event reminder",
	OTHER: "Notification",
};

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: "auto",
});

const formatRelativeTime = (isoValue: string): string => {
	const date = new Date(isoValue);
	if (Number.isNaN(date.getTime())) {
		return "Unknown time";
	}

	const diffMs = date.getTime() - Date.now();
	const diffMinutes = Math.round(diffMs / (1000 * 60));

	if (Math.abs(diffMinutes) < 60) {
		return relativeFormatter.format(diffMinutes, "minute");
	}

	const diffHours = Math.round(diffMinutes / 60);
	if (Math.abs(diffHours) < 24) {
		return relativeFormatter.format(diffHours, "hour");
	}

	const diffDays = Math.round(diffHours / 24);
	return relativeFormatter.format(diffDays, "day");
};

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
	notifications,
	loading,
	error,
	fallbackMessage,
	markingAllRead,
	markingReadIds,
	onRefresh,
	onMarkRead,
	onMarkAllRead,
}) => {
	const unreadCount = notifications.filter(
		(notification) => !notification.isRead,
	).length;

	return (
		<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
			<Stack spacing={2}>
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems={{ xs: "stretch", sm: "center" }}
					gap={1}
					flexDirection={{ xs: "column", sm: "row" }}
				>
					<Box>
						<Typography variant="h4" component="h1">
							Notifications
						</Typography>
						<Typography color="text.secondary">
							{unreadCount === 0
								? "No unread notifications"
								: `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
						</Typography>
					</Box>
					<Box display="flex" gap={1}>
						<Button
							variant="outlined"
							onClick={onRefresh}
							disabled={loading}
						>
							Refresh
						</Button>
						<Button
							variant="outlined"
							onClick={() => void onMarkAllRead()}
							disabled={markingAllRead || unreadCount === 0 || loading}
						>
							{markingAllRead ? "Marking..." : "Mark all as read"}
						</Button>
					</Box>
				</Box>

				{fallbackMessage && <Alert severity="info">{fallbackMessage}</Alert>}

				<Paper sx={{ p: 2 }}>
					{loading ? (
						<Box display="flex" justifyContent="center" py={3}>
							<CircularProgress aria-label="Loading notifications" />
						</Box>
					) : error ? (
						<Alert
							severity="error"
							action={
								<Button color="inherit" size="small" onClick={onRefresh}>
									Retry
								</Button>
							}
						>
							{error}
						</Alert>
					) : notifications.length === 0 ? (
						<Typography color="text.secondary">
							No notifications yet. Event and task reminders will appear here.
						</Typography>
					) : (
						<Stack
							component="ul"
							spacing={1}
							sx={{ m: 0, p: 0, listStyle: "none" }}
						>
							{notifications.map((notification) => {
								const isMarkingRead = markingReadIds.includes(notification.id);
								const readLabel = notification.isRead ? "Read" : "Unread";
								return (
									<Box
										component="li"
										key={notification.id}
										aria-label={`${notificationTypeLabel[notification.type]}, ${notification.message}, ${readLabel} notification`}
										sx={{
											border: 1,
											borderColor: "divider",
											borderRadius: 1,
											p: 1.5,
											backgroundColor: notification.isRead
												? "background.paper"
												: "rgba(25, 118, 210, 0.08)",
										}}
									>
										<Stack spacing={1}>
											<Box
												display="flex"
												justifyContent="space-between"
												alignItems="flex-start"
												gap={1}
												flexWrap="wrap"
											>
												<Box>
													<Typography
														fontWeight={notification.isRead ? 400 : 700}
													>
														{notification.message}
													</Typography>
													<Typography color="text.secondary" variant="body2">
														{notificationTypeLabel[notification.type]}
													</Typography>
												</Box>
												<Box display="flex" alignItems="center" gap={1}>
													<Chip size="small" label={readLabel} />
													<Typography
														variant="caption"
														color="text.secondary"
														title={new Date(
															notification.createdAt,
														).toLocaleString()}
													>
														{formatRelativeTime(notification.createdAt)}
													</Typography>
												</Box>
											</Box>

											<Box display="flex" justifyContent="flex-end">
												<Button
													size="small"
													onClick={() => void onMarkRead(notification.id)}
													disabled={notification.isRead || isMarkingRead}
												>
													{isMarkingRead ? "Marking..." : "Mark as read"}
												</Button>
											</Box>
										</Stack>
									</Box>
								);
							})}
						</Stack>
					)}
				</Paper>
			</Stack>
		</Container>
	);
};
