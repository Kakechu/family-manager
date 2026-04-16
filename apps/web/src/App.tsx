import type { AuthUser, NotificationDto } from "@family-manager/shared";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import {
	Badge,
	Box,
	Button,
	CircularProgress,
	CssBaseline,
	Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { LoginForm } from "./features/auth/LoginForm";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { FamilyMembersPage } from "./features/family-members/FamilyMembersPage";
import { NotificationsPage } from "./features/notifications/NotificationsPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { getCurrentUser, logout } from "./services/auth";
import {
	isMissingEndpointError,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "./services/notifications";

interface NotificationsState {
	items: NotificationDto[];
	loading: boolean;
	error?: string;
	fallbackMessage?: string;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
	const responseMessage = (
		error as {
			response?: {
				data?: { error?: { message?: unknown } };
			};
		}
	).response?.data?.error?.message;

	if (
		typeof responseMessage === "string" &&
		responseMessage.trim().length > 0
	) {
		return responseMessage;
	}

	if (axios.isAxiosError(error)) {
		const maybeMessage = (
			error.response?.data as { error?: { message?: unknown } }
		)?.error?.message;
		if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
			return maybeMessage;
		}
	}

	return fallback;
};

const compareByCreatedAtDesc = (
	a: NotificationDto,
	b: NotificationDto,
): number => {
	return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(
		undefined,
	);
	const [checkingAuth, setCheckingAuth] = useState(true);
	const [authError, setAuthError] = useState<string | undefined>();
	const [activeView, setActiveView] = useState<
		"calendar" | "tasks" | "family-members" | "notifications"
	>("calendar");
	const [notificationsState, setNotificationsState] =
		useState<NotificationsState>({
			items: [],
			loading: false,
		});
	const [markingReadIds, setMarkingReadIds] = useState<number[]>([]);
	const [markingAllRead, setMarkingAllRead] = useState(false);

	useEffect(() => {
		const check = async (): Promise<void> => {
			setAuthError(undefined);
			try {
				const user = await getCurrentUser();
				setAuthUser(user);
			} catch (error) {
				setAuthUser(null);
			} finally {
				setCheckingAuth(false);
			}
		};

		void check();
	}, []);

	const handleLoginSuccess = (user: AuthUser): void => {
		setAuthUser(user);
		setAuthError(undefined);
		setActiveView("calendar");
	};

	const handleLogout = async (): Promise<void> => {
		try {
			await logout();
		} finally {
			setAuthUser(null);
			setNotificationsState({
				items: [],
				loading: false,
			});
			setMarkingReadIds([]);
			setMarkingAllRead(false);
		}
	};

	const loadNotifications = React.useCallback(async (): Promise<void> => {
		setNotificationsState((prev) => ({
			...prev,
			loading: true,
			error: undefined,
		}));

		try {
			const response = await listNotifications();
			setNotificationsState((prev) => ({
				...prev,
				loading: false,
				items: [...response.data].sort(compareByCreatedAtDesc),
				error: undefined,
			}));
		} catch (error) {
			if (isMissingEndpointError(error)) {
				setNotificationsState({
					items: [],
					loading: false,
					error:
						"Notifications inbox endpoint is not available yet in this environment.",
				});
				return;
			}

			setNotificationsState((prev) => ({
				...prev,
				loading: false,
				error: getApiErrorMessage(
					error,
					"Failed to load notifications. Please try again.",
				),
			}));
		}
	}, []);

	useEffect(() => {
		if (!authUser) {
			setNotificationsState({
				items: [],
				loading: false,
			});
			return;
		}

		void loadNotifications();
	}, [authUser, loadNotifications]);

	const handleMarkRead = React.useCallback(
		async (id: number): Promise<void> => {
			setMarkingReadIds((prev) => [...prev, id]);
			setNotificationsState((prev) => ({ ...prev, error: undefined }));

			try {
				await markNotificationRead(id);
				setNotificationsState((prev) => ({
					...prev,
					items: prev.items.map((item) =>
						item.id === id ? { ...item, isRead: true } : item,
					),
				}));
			} catch (error) {
				if (isMissingEndpointError(error)) {
					setNotificationsState((prev) => ({
						...prev,
						error:
							"Mark-as-read endpoint is not available yet in this environment.",
					}));
					return;
				}

				setNotificationsState((prev) => ({
					...prev,
					error: getApiErrorMessage(
						error,
						"Failed to mark notification as read.",
					),
				}));
			} finally {
				setMarkingReadIds((prev) => prev.filter((itemId) => itemId !== id));
			}
		},
		[],
	);

	const handleMarkAllRead = React.useCallback(async (): Promise<void> => {
		setMarkingAllRead(true);
		setNotificationsState((prev) => ({ ...prev, error: undefined }));

		try {
			await markAllNotificationsRead();
			setNotificationsState((prev) => ({
				...prev,
				fallbackMessage: undefined,
				items: prev.items.map((item) => ({ ...item, isRead: true })),
			}));
		} catch (error) {
			if (isMissingEndpointError(error)) {
				const unreadIds = notificationsState.items
					.filter((item) => !item.isRead)
					.map((item) => item.id);

				if (unreadIds.length === 0) {
					setNotificationsState((prev) => ({
						...prev,
						fallbackMessage:
							"Bulk endpoint is unavailable; all notifications are already read.",
					}));
					return;
				}

				const results = await Promise.allSettled(
					unreadIds.map((id) => markNotificationRead(id)),
				);

				const successfulIds = new Set<number>();
				results.forEach((result, index) => {
					if (result.status === "fulfilled") {
						successfulIds.add(unreadIds[index]);
					}
				});

				setNotificationsState((prev) => ({
					...prev,
					items: prev.items.map((item) =>
						successfulIds.has(item.id) ? { ...item, isRead: true } : item,
					),
					fallbackMessage:
						successfulIds.size === unreadIds.length
							? "Mark-all endpoint is unavailable, so notifications were marked read one by one."
							: "Mark-all endpoint is unavailable, and some notifications could not be marked read.",
				}));
				return;
			}

			setNotificationsState((prev) => ({
				...prev,
				error: getApiErrorMessage(
					error,
					"Failed to mark all notifications as read.",
				),
			}));
		} finally {
			setMarkingAllRead(false);
		}
	}, [notificationsState.items]);

	const unreadNotificationsCount = notificationsState.items.filter(
		(item) => !item.isRead,
	).length;

	return (
		<>
			<CssBaseline />
			<Box sx={{ mt: 4, mb: 4 }}>
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems={{ xs: "flex-start", md: "center" }}
					flexDirection={{ xs: "column", md: "row" }}
					gap={1}
					mb={2}
				>
					<Typography variant="h4" component="h1">
						FamilyManager
					</Typography>
					{authUser && (
						<Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
							<Button
								variant={activeView === "calendar" ? "contained" : "text"}
								color="inherit"
								onClick={() => setActiveView("calendar")}
							>
								Calendar
							</Button>
							<Button
								variant={activeView === "tasks" ? "contained" : "text"}
								color="inherit"
								onClick={() => setActiveView("tasks")}
							>
								Tasks
							</Button>
							<Button
								variant={activeView === "family-members" ? "contained" : "text"}
								color="inherit"
								onClick={() => setActiveView("family-members")}
							>
								Family members
							</Button>
							<Button
								variant={activeView === "notifications" ? "contained" : "text"}
								color="inherit"
								onClick={() => setActiveView("notifications")}
								startIcon={
									<Badge
										color="error"
										badgeContent={
											unreadNotificationsCount > 9
												? "9+"
												: unreadNotificationsCount
										}
										invisible={unreadNotificationsCount === 0}
									>
										<NotificationsNoneIcon fontSize="small" />
									</Badge>
								}
							>
								Notifications
							</Button>
							<Button
								variant="text"
								color="inherit"
								onClick={() => void handleLogout()}
							>
								Logout
							</Button>
						</Box>
					)}
				</Box>
				{checkingAuth ? (
					<Box display="flex" justifyContent="center" mt={4}>
						<CircularProgress />
					</Box>
				) : authUser ? (
					activeView === "calendar" ? (
						<CalendarPage />
					) : activeView === "tasks" ? (
						<TasksPage />
					) : activeView === "notifications" ? (
						<NotificationsPage
							notifications={notificationsState.items}
							loading={notificationsState.loading}
							error={notificationsState.error}
							fallbackMessage={notificationsState.fallbackMessage}
							markingAllRead={markingAllRead}
							markingReadIds={markingReadIds}
							onRefresh={() => {
								void loadNotifications();
							}}
							onMarkRead={handleMarkRead}
							onMarkAllRead={handleMarkAllRead}
						/>
					) : (
						<FamilyMembersPage />
					)
				) : (
					<LoginForm onLoginSuccess={handleLoginSuccess} />
				)}
			</Box>
		</>
	);
}

export default App;
