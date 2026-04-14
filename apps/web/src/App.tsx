import type { AuthUser } from "@family-manager/shared";
import {
	Box,
	Button,
	CircularProgress,
	CssBaseline,
	Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { LoginForm } from "./features/auth/LoginForm";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { getCurrentUser, logout } from "./services/auth";

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(
		undefined,
	);
	const [checkingAuth, setCheckingAuth] = useState(true);
	const [authError, setAuthError] = useState<string | undefined>();
	const [activeView, setActiveView] = useState<"calendar" | "tasks">(
		"calendar",
	);

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
		}
	};

	return (
		<>
			<CssBaseline />
			<Box sx={{ mt: 4, mb: 4 }}>
				<Box
					display="flex"
					justifyContent="space-between"
					alignItems="center"
					mb={2}
				>
					<Typography variant="h4" component="h1">
						FamilyManager
					</Typography>
					{authUser && (
						<Box display="flex" alignItems="center" gap={1}>
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
					) : (
						<TasksPage />
					)
				) : (
					<LoginForm onLoginSuccess={handleLoginSuccess} />
				)}
			</Box>
		</>
	);
}

export default App;
