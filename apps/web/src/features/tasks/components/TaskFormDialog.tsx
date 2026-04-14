import type {
	TaskCategoryDto,
	TaskDto,
	TaskRecurrenceType,
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
import { createTask, updateTask } from "../../../services/tasks";

export interface TaskFormDialogProps {
	open: boolean;
	onClose: () => void;
	categories: TaskCategoryDto[];
	initialTask?: TaskDto;
	onTaskSaved: (message: string) => void;
}

const RECURRENCE_OPTIONS: TaskRecurrenceType[] = [
	"NONE",
	"DAILY",
	"WEEKLY",
	"MONTHLY",
];

export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
	open,
	onClose,
	categories,
	initialTask,
	onTaskSaved,
}) => {
	const [title, setTitle] = useState(initialTask?.title ?? "");
	const [description, setDescription] = useState(
		initialTask?.description ?? "",
	);
	const [dueDate, setDueDate] = useState<string | "">(
		initialTask?.dueDate
			? new Date(initialTask.dueDate).toISOString().split("T")[0]
			: "",
	);
	const [categoryId, setCategoryId] = useState<number | "">(
		initialTask?.categoryId ?? "",
	);
	const [recurrenceType, setRecurrenceType] = useState<TaskRecurrenceType>(
		initialTask?.recurrenceType ?? "NONE",
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const safeCategories = Array.isArray(categories) ? categories : [];
	const isEditMode = Boolean(initialTask);

	const handleSave = async (): Promise<void> => {
		setError(undefined);

		if (!title.trim()) {
			setError("Title is required");
			return;
		}

		if (!categoryId || typeof categoryId !== "number") {
			setError("Category is required");
			return;
		}

		if (recurrenceType !== "NONE" && !dueDate) {
			setError("Recurring tasks must have a due date");
			return;
		}

		setSaving(true);

		try {
			const payload = {
				title,
				description: description || null,
				// Backend expects ISO-8601 string in UTC or null
				// We treat the picker value as local date and convert to UTC midnight.
				// UX doc: due date is optional but recommended.
				dueDate: dueDate ? new Date(dueDate).toISOString() : null,
				recurrenceType,
				categoryId,
			};

			if (isEditMode && initialTask) {
				await updateTask(initialTask.id, payload);
				onTaskSaved("Task updated");
			} else {
				await createTask(payload);
				onTaskSaved("Task created");
			}
		} catch (err) {
			console.error("Failed to save task", err);
			setError("Failed to save task. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>{isEditMode ? "Edit task" : "Add task"}</DialogTitle>
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
						label="Due date"
						type="date"
						InputLabelProps={{ shrink: true }}
						value={dueDate}
						onChange={(event) => setDueDate(event.target.value)}
						fullWidth
					/>
					<FormControl fullWidth>
						<InputLabel id="task-category-label">Category</InputLabel>
						<Select
							labelId="task-category-label"
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
						<InputLabel id="task-recurrence-label">Repeat</InputLabel>
						<Select
							labelId="task-recurrence-label"
							label="Repeat"
							value={recurrenceType}
							onChange={(event) =>
								setRecurrenceType(event.target.value as TaskRecurrenceType)
							}
						>
							{RECURRENCE_OPTIONS.map((option) => (
								<MenuItem key={option} value={option}>
									{option === "NONE" ? "Does not repeat" : option}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{error && (
						<TextField
							value={error}
							variant="standard"
							InputProps={{ readOnly: true }}
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
