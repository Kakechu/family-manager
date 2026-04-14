import type { AuthUser } from "@family-manager/shared";
import { Box, CircularProgress, CssBaseline, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { LoginForm } from "./features/auth/LoginForm";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { getCurrentUser } from "./services/auth";

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(
		undefined,
	);
	const [checkingAuth, setCheckingAuth] = useState(true);
	const [authError, setAuthError] = useState<string | undefined>();

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
	};

	return (
		<>
			<CssBaseline />
			<Box sx={{ mt: 4, mb: 4 }}>
				<Typography variant="h4" component="h1" align="center" gutterBottom>
					FamilyManager
				</Typography>
				{checkingAuth ? (
					<Box display="flex" justifyContent="center" mt={4}>
						<CircularProgress />
					</Box>
				) : authUser ? (
					<CalendarPage />
				) : (
					<LoginForm onLoginSuccess={handleLoginSuccess} />
				)}
			</Box>
		</>
	);
}

export default App;
