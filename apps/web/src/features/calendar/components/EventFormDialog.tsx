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
import { useMemo, useState } from "react";
import { createEvent, updateEvent } from "../../../services/events";

export interface EventFormDialogProps {
	open: boolean;
	onClose: () => void;
	categories: EventCategoryDto[];
	members: FamilyMemberDto[];
	initialEvent?: EventDto;
	initialAssignedMemberIds?: number[];
	onEventSaved: (message: string) => void;
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
	const [startTime, setStartTime] = useState(
		initialEvent?.startTime ?? new Date().toISOString(),
	);
	const [endTime, setEndTime] = useState(
		initialEvent?.endTime ??
			new Date(Date.now() + 60 * 60 * 1000).toISOString(),
	);
	const [categoryId, setCategoryId] = useState<number | "">(
		initialEvent?.categoryId ?? "",
	);
	const [assignedMemberIds, setAssignedMemberIds] = useState<number[]>(
		initialAssignedMemberIds ?? [],
	);
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
				onEventSaved("Event updated");
			} else {
				await createEvent({
					title,
					description: description || null,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					categoryId,
				});
				onEventSaved("Event created");
			}
		} catch (err) {
			console.error("Failed to save event", err);
			setError("Failed to save event. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const localStartValue = useMemo(
		() => new Date(startTime).toISOString().slice(0, 16),
		[startTime],
	);
	const localEndValue = useMemo(
		() => new Date(endTime).toISOString().slice(0, 16),
		[endTime],
	);

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
						value={localStartValue}
						onChange={(event) => setStartTime(event.target.value)}
						fullWidth
					/>
					<TextField
						label="End time"
						type="datetime-local"
						InputLabelProps={{ shrink: true }}
						value={localEndValue}
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
							value={assignedMemberIds}
							onChange={(event) => {
								const value = event.target.value;
								const ids = Array.isArray(value)
									? value.map((v) => Number(v))
									: [];
								setAssignedMemberIds(ids);
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
