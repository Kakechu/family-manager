import type {
	CreateFamilyMemberRequestDto,
	FamilyMemberDto,
	FamilyMemberRole,
} from "@family-manager/shared";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Container,
	MenuItem,
	Paper,
	Snackbar,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	createFamilyMember,
	listFamilyMembers,
} from "../../services/familyMembers";

interface FamilyMembersState {
	members: FamilyMemberDto[];
	loading: boolean;
	error?: string;
}

interface AddMemberFormState {
	firstName: string;
	lastName: string;
	role: FamilyMemberRole;
	dateOfBirth: string;
}

const defaultFormState: AddMemberFormState = {
	firstName: "",
	lastName: "",
	role: "ADULT",
	dateOfBirth: "",
};

const mapRoleLabel = (role: FamilyMemberRole): string => {
	return role === "ADULT" ? "Adult" : "Child";
};

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

export const FamilyMembersPage: React.FC = () => {
	const [state, setState] = useState<FamilyMembersState>({
		members: [],
		loading: true,
	});
	const [form, setForm] = useState<AddMemberFormState>(defaultFormState);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | undefined>();
	const [submitError, setSubmitError] = useState<string | undefined>();
	const [successMessage, setSuccessMessage] = useState<string | undefined>();

	const loadMembers = useCallback(async (): Promise<void> => {
		setState((prev) => ({ ...prev, loading: true, error: undefined }));

		try {
			const response = await listFamilyMembers();
			setState({
				members: response.data,
				loading: false,
			});
		} catch (error) {
			console.error("Failed to load family members", error);
			setState((prev) => ({
				...prev,
				loading: false,
				error: "Failed to load family members. Please try again.",
			}));
		}
	}, []);

	useEffect(() => {
		void loadMembers();
	}, [loadMembers]);

	const validateForm = (current: AddMemberFormState): string | undefined => {
		if (current.firstName.trim().length === 0) {
			return "First name is required.";
		}
		if (current.lastName.trim().length === 0) {
			return "Last name is required.";
		}
		return undefined;
	};

	const handleSubmit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		setFormError(undefined);
		setSubmitError(undefined);

		const validationMessage = validateForm(form);
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setSubmitting(true);

		const payload: CreateFamilyMemberRequestDto = {
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			role: form.role,
			dateOfBirth: form.dateOfBirth
				? new Date(`${form.dateOfBirth}T00:00:00.000Z`).toISOString()
				: null,
		};

		try {
			const response = await createFamilyMember(payload);
			setState((prev) => ({
				...prev,
				members: [...prev.members, response.data].sort((a, b) => a.id - b.id),
			}));
			setForm(defaultFormState);
			setSuccessMessage("Family member added");
		} catch (error) {
			console.error("Failed to add family member", error);
			setSubmitError(
				getApiErrorMessage(
					error,
					"Failed to add family member. Please try again.",
				),
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
			<Stack spacing={2}>
				<Typography variant="h4" component="h1">
					Family members
				</Typography>

				<Paper component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
					<Stack spacing={2}>
						<Typography variant="h6" component="h2">
							Add family member
						</Typography>
						<Box
							display="grid"
							gridTemplateColumns={{
								xs: "1fr",
								sm: "repeat(2, minmax(0, 1fr))",
							}}
							gap={2}
						>
							<TextField
								label="First name"
								value={form.firstName}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										firstName: event.target.value,
									}))
								}
								fullWidth
							/>
							<TextField
								label="Last name"
								value={form.lastName}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										lastName: event.target.value,
									}))
								}
								fullWidth
							/>
							<TextField
								select
								label="Role"
								value={form.role}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										role: event.target.value as FamilyMemberRole,
									}))
								}
								fullWidth
							>
								<MenuItem value="ADULT">Adult</MenuItem>
								<MenuItem value="CHILD">Child</MenuItem>
							</TextField>
							<TextField
								label="Date of birth"
								type="date"
								value={form.dateOfBirth}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										dateOfBirth: event.target.value,
									}))
								}
								InputLabelProps={{ shrink: true }}
								fullWidth
							/>
						</Box>

						<Button type="submit" variant="contained" disabled={submitting}>
							{submitting ? "Adding..." : "Add member"}
						</Button>

						{formError && <Alert severity="error">{formError}</Alert>}
						{submitError && <Alert severity="error">{submitError}</Alert>}
					</Stack>
				</Paper>

				<Paper sx={{ p: 2 }}>
					<Typography variant="h6" component="h2" gutterBottom>
						Family member list
					</Typography>

					{state.loading ? (
						<Box display="flex" justifyContent="center" py={3}>
							<CircularProgress />
						</Box>
					) : state.error ? (
						<Alert
							severity="error"
							action={
								<Button
									color="inherit"
									size="small"
									onClick={() => void loadMembers()}
								>
									Retry
								</Button>
							}
						>
							{state.error}
						</Alert>
					) : state.members.length === 0 ? (
						<Typography color="text.secondary">
							No family members yet. Add one to start assigning events and
							tasks.
						</Typography>
					) : (
						<Stack spacing={1}>
							{state.members.map((member) => (
								<Box
									key={member.id}
									display="flex"
									justifyContent="space-between"
									alignItems="center"
									gap={1}
									sx={{
										border: 1,
										borderColor: "divider",
										borderRadius: 1,
										p: 1.5,
										flexWrap: "wrap",
									}}
								>
									<Typography>
										{member.firstName} {member.lastName}
									</Typography>
									<Chip size="small" label={mapRoleLabel(member.role)} />
								</Box>
							))}
						</Stack>
					)}
				</Paper>

				<Snackbar
					open={Boolean(successMessage)}
					autoHideDuration={3000}
					onClose={() => setSuccessMessage(undefined)}
					message={successMessage}
				/>
			</Stack>
		</Container>
	);
};
