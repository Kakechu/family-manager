import type {
	EventCategoryDto,
	EventDto,
	FamilyMemberDto,
} from "@family-manager/shared";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import {
	addEventAssignments,
	deleteEventAssignment,
} from "../../../services/eventAssignments";
import { createEvent, updateEvent } from "../../../services/events";

export interface EventFormDialogProps {
	open: boolean;
	onClose: () => void;
	categories: EventCategoryDto[];
	members: FamilyMemberDto[];
	initialEvent?: EventDto;
	initialAssignedMemberIds?: number[];
	onEventSaved: (message: string, assignedMemberIds: number[]) => void;
}

export const EventFormDialog: React.FC<EventFormDialogProps> = ({
	open,
	onClose,
	categories,
	members,
	initialEvent,
	initialAssignedMemberIds,
	onEventSaved,
}) => {
	const [title, setTitle] = useState(initialEvent?.title ?? "");
	const [description, setDescription] = useState(
		initialEvent?.description ?? "",
	);

	const formatLocalInput = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	const toLocalInputValueFromIso = (iso: string): string => {
		return formatLocalInput(new Date(iso));
	};

	const now = new Date();
	const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

	const [startTime, setStartTime] = useState<string>(
		initialEvent?.startTime
			? toLocalInputValueFromIso(initialEvent.startTime)
			: formatLocalInput(now),
	);
	const [endTime, setEndTime] = useState<string>(
		initialEvent?.endTime
			? toLocalInputValueFromIso(initialEvent.endTime)
			: formatLocalInput(oneHourFromNow),
	);
	const [categoryId, setCategoryId] = useState<number | "">(
		initialEvent?.categoryId ?? "",
	);
	const [assignedMemberIds, setAssignedMemberIds] = useState<number[]>(
		initialAssignedMemberIds ?? [],
	);
	const [assignedSelectOpen, setAssignedSelectOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const safeCategories = Array.isArray(categories) ? categories : [];
	const safeMembers = Array.isArray(members) ? members : [];

	const isEditMode = Boolean(initialEvent);

	const handleSave = async (): Promise<void> => {
		setError(undefined);

		if (!title.trim()) {
			setError("Title is required");
			return;
		}

		if (!startTime || !endTime) {
			setError("Start and end time are required");
			return;
		}

		if (!categoryId || typeof categoryId !== "number") {
			setError("Category is required");
			return;
		}

		const start = new Date(startTime);
		const end = new Date(endTime);

		if (end <= start) {
			setError("End time must be after start time");
			return;
		}

		setSaving(true);

		try {
			if (isEditMode && initialEvent) {
				await updateEvent(initialEvent.id, {
					title,
					description: description || null,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					categoryId,
				});

				const previousIds = new Set(initialAssignedMemberIds ?? []);
				const nextIds = new Set(assignedMemberIds);

				const toAdd: number[] = [];
				const toRemove: number[] = [];

				for (const id of nextIds) {
					if (!previousIds.has(id)) {
						toAdd.push(id);
					}
				}

				for (const id of previousIds) {
					if (!nextIds.has(id)) {
						toRemove.push(id);
					}
				}

				if (toAdd.length > 0) {
					await addEventAssignments({
						eventId: initialEvent.id,
						familyMemberIds: toAdd,
					});
				}

				if (toRemove.length > 0) {
					await Promise.all(
						toRemove.map((id) => deleteEventAssignment(initialEvent.id, id)),
					);
				}

				onEventSaved("Event updated", assignedMemberIds);
			} else {
				const created = await createEvent({
					title,
					description: description || null,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					categoryId,
				});

				if (assignedMemberIds.length > 0) {
					await addEventAssignments({
						eventId: created.data.id,
						familyMemberIds: assignedMemberIds,
					});
				}

				onEventSaved("Event created", assignedMemberIds);
			}
		} catch (err) {
			console.error("Failed to save event", err);
			setError("Failed to save event. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>{isEditMode ? "Edit event" : "Add event"}</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} mt={1}>
					<TextField
						label="Title"
						fullWidth
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						required
					/>
					<TextField
						label="Description"
						fullWidth
						multiline
						minRows={2}
						value={description}
						onChange={(event) => setDescription(event.target.value)}
					/>
					<TextField
						label="Start time"
						type="datetime-local"
						InputLabelProps={{ shrink: true }}
						value={startTime}
						onChange={(event) => setStartTime(event.target.value)}
						fullWidth
					/>
					<TextField
						label="End time"
						type="datetime-local"
						InputLabelProps={{ shrink: true }}
						value={endTime}
						onChange={(event) => setEndTime(event.target.value)}
						fullWidth
					/>
					<FormControl fullWidth>
						<InputLabel id="category-label">Category</InputLabel>
						<Select
							labelId="category-label"
							label="Category"
							value={categoryId}
							onChange={(event) => {
								const value = event.target.value;
								setCategoryId(
									typeof value === "number" ? value : Number(value),
								);
							}}
							fullWidth
						>
							{safeCategories.map((category) => (
								<MenuItem key={category.id} value={category.id}>
									{category.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl fullWidth>
						<InputLabel id="assigned-members-label">Assigned to</InputLabel>
						<Select
							labelId="assigned-members-label"
							label="Assigned to"
							multiple
							open={assignedSelectOpen}
							onOpen={() => setAssignedSelectOpen(true)}
							onClose={() => setAssignedSelectOpen(false)}
							value={assignedMemberIds}
							onChange={(event) => {
								const value = event.target.value;
								const ids = Array.isArray(value)
									? value.map((v) => Number(v))
									: [];
								setAssignedMemberIds(ids);
								setAssignedSelectOpen(false);
							}}
							renderValue={(selected) => {
								if (!selected.length) {
									return "";
								}
								return safeMembers
									.filter((member) => selected.includes(member.id))
									.map((member) => `${member.firstName} ${member.lastName}`)
									.join(", ");
							}}
						>
							{safeMembers.map((member) => (
								<MenuItem key={member.id} value={member.id}>
									{member.firstName} {member.lastName}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{error && (
						<TextField
							value={error}
							variant="standard"
							InputProps={{ readOnly: true }}
							// Display validation or network error in a subtle way
							sx={{ color: "error.main" }}
						/>
					)}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button onClick={() => void handleSave()} disabled={saving}>
					{isEditMode ? "Save" : "Create"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};
