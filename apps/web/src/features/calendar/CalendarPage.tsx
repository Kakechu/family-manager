import type {
	EventCategoryDto,
	EventDto,
	FamilyMemberDto,
} from "@family-manager/shared";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Container,
	Snackbar,
	Typography,
} from "@mui/material";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listEventCategories } from "../../services/eventCategories";
import { listEvents } from "../../services/events";
import { listFamilyMembers } from "../../services/familyMembers";
import { CalendarHeader } from "./components/CalendarHeader";
import { EventFormDialog } from "./components/EventFormDialog";
import { EventsList } from "./components/EventsList";

interface CalendarState {
	events: EventDto[];
	categories: EventCategoryDto[];
	members: FamilyMemberDto[];
	loading: boolean;
	error?: string;
}

export const CalendarPage: React.FC = () => {
	const [state, setState] = useState<CalendarState>({
		events: [],
		categories: [],
		members: [],
		loading: true,
	});
	const [selectedMemberId, setSelectedMemberId] = useState<
		number | undefined
	>();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | undefined>();

	const loadData = useCallback(
		async (options: { memberId?: number } = {}): Promise<void> => {
			setState((prev) => ({ ...prev, loading: true, error: undefined }));

			try {
				const [eventsResponse, categoriesResponse, membersResponse] =
					await Promise.all([
						listEvents({
							familyMemberId: options.memberId,
						}),
						listEventCategories(),
						listFamilyMembers(),
					]);

				setState({
					events: eventsResponse.data,
					categories: categoriesResponse.data,
					members: membersResponse.data,
					loading: false,
				});
			} catch (error) {
				console.error("Failed to load calendar data", error);
				setState((prev) => ({
					...prev,
					loading: false,
					// Generic message; details can be logged server-side
					// UX doc: section 4.3 Error States
					// "Do not discard user input on error" – here this is read-only list
					error: "Failed to load calendar data. Please try again.",
				}));
			}
		},
		[],
	);

	useEffect(() => {
		void loadData({ memberId: selectedMemberId });
	}, [loadData, selectedMemberId]);

	const handleRetry = (): void => {
		void loadData({ memberId: selectedMemberId });
	};

	const handleMemberFilterChange = (memberId?: number): void => {
		setSelectedMemberId(memberId);
	};

	const handleEventCreatedOrUpdated = (message: string): void => {
		setSuccessMessage(message);
		void loadData({ memberId: selectedMemberId });
	};

	const handleEventDeleted = (): void => {
		setSuccessMessage("Event deleted");
		void loadData({ memberId: selectedMemberId });
	};

	const groupedEvents = useMemo(() => {
		const events = Array.isArray(state.events) ? state.events : [];

		if (!Array.isArray(state.events)) {
			// Defensive guard in case runtime data shape drifts from expectations.
			// This avoids hard crashes in the browser and falls back to an empty list.
			// eslint-disable-next-line no-console
			console.warn("CalendarPage: state.events was not an array", state.events);
		}

		const groups = new Map<string, EventDto[]>();

		for (const event of events) {
			const dateKey = event.startTime.split("T")[0];
			const existing = groups.get(dateKey) ?? [];
			groups.set(dateKey, [...existing, event]);
		}

		return Array.from(groups.entries())
			.sort(([a], [b]) => (a < b ? -1 : 1))
			.map(([date, events]) => ({
				date,
				events: events.sort(
					(a, b) =>
						new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
				),
			}));
	}, [state.events]);

	return (
		<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
			<Box display="flex" flexDirection="column" gap={2}>
				<Typography variant="h4" component="h1">
					Family calendar
				</Typography>

				<CalendarHeader
					members={state.members}
					selectedMemberId={selectedMemberId}
					onMemberFilterChange={handleMemberFilterChange}
					onAddEventClick={() => setIsDialogOpen(true)}
				/>

				{state.loading ? (
					<Box display="flex" justifyContent="center" mt={4}>
						<CircularProgress />
					</Box>
				) : state.error ? (
					<Alert
						severity="error"
						action={
							<Button color="inherit" size="small" onClick={handleRetry}>
								Retry
							</Button>
						}
					>
						{state.error}
					</Alert>
				) : groupedEvents.length === 0 ? (
					<Box mt={4} textAlign="center">
						<Typography variant="h6" gutterBottom>
							No events yet for these filters
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Plan your family schedule by adding events.
						</Typography>
						<Button
							variant="contained"
							color="primary"
							onClick={() => setIsDialogOpen(true)}
						>
							Add event
						</Button>
					</Box>
				) : (
					<EventsList
						groups={groupedEvents}
						categories={state.categories}
						members={state.members}
						onEventUpdated={() => handleEventCreatedOrUpdated("Event updated")}
						onEventDeleted={handleEventDeleted}
					/>
				)}

				<EventFormDialog
					open={isDialogOpen}
					onClose={() => setIsDialogOpen(false)}
					categories={state.categories}
					members={state.members}
					onEventSaved={(message) => {
						setIsDialogOpen(false);
						handleEventCreatedOrUpdated(message);
					}}
				/>

				<Snackbar
					open={Boolean(successMessage)}
					autoHideDuration={3000}
					onClose={() => setSuccessMessage(undefined)}
					message={successMessage}
				/>
			</Box>
		</Container>
	);
};
