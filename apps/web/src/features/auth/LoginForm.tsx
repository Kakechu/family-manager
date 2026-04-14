import type { AuthUser } from "@family-manager/shared";
import {
	Alert,
	Box,
	Button,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { login } from "../../services/auth";

export interface LoginFormProps {
	onLoginSuccess: (user: AuthUser) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
	const [email, setEmail] = useState("anderson.parent@example.com");
	const [password, setPassword] = useState("password123");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const handleSubmit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		setError(undefined);
		setSubmitting(true);

		try {
			const user = await login({ email, password });
			onLoginSuccess(user);
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error("Login failed", err);
			setError("Invalid email or password");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Box display="flex" justifyContent="center" mt={4}>
			<Paper sx={{ p: 3, width: "100%", maxWidth: 400 }} elevation={3}>
				<Typography variant="h6" gutterBottom>
					Sign in
				</Typography>
				<Typography variant="body2" color="text.secondary" gutterBottom>
					Use the seeded parent account or your own registered user.
				</Typography>
				<form onSubmit={handleSubmit}>
					<Box display="flex" flexDirection="column" gap={2}>
						<TextField
							label="Email"
							fullWidth
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
						<TextField
							label="Password"
							fullWidth
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<Button
							type="submit"
							variant="contained"
							color="primary"
							disabled={submitting}
						>
							{submitting ? "Signing in..." : "Sign in"}
						</Button>
						{error && <Alert severity="error">{error}</Alert>}
					</Box>
				</form>
			</Paper>
		</Box>
	);
};
