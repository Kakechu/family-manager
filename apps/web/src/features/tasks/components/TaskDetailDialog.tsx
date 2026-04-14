import type {
	CommentDto,
	FamilyMemberDto,
	TaskCategoryDto,
	TaskDto,
} from "@family-manager/shared";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createComment, listComments } from "../../../services/comments";
import {
	addTaskAssignments,
	deleteTaskAssignment,
	listTaskAssignments,
} from "../../../services/taskAssignments";

export interface TaskDetailDialogProps {
	open: boolean;
	task: TaskDto | null;
	members: FamilyMemberDto[];
	categories: TaskCategoryDto[];
	onClose: () => void;
}

const getReminderStatus = (
	isoDueDate?: string | null,
): {
	label: string;
	color?: "default" | "primary" | "secondary" | "warning";
} => {
	if (!isoDueDate) {
		return { label: "No due date", color: "default" };
	}

	const due = new Date(isoDueDate);
	const now = new Date();

	const startOfDay = (date: Date): number => {
		return new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		).getTime();
	};

	const dueDay = startOfDay(due);
	const today = startOfDay(now);
	const diffDays = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return { label: `Overdue by ${Math.abs(diffDays)}d`, color: "warning" };
	}
	if (diffDays === 0) {
		return { label: "Due today", color: "secondary" };
	}
	if (diffDays === 1) {
		return { label: "Due tomorrow", color: "primary" };
	}

	return { label: `Due in ${diffDays}d`, color: "primary" };
};

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
	open,
	task,
	members,
	categories,
	onClose,
}) => {
	const [assignedMemberIds, setAssignedMemberIds] = useState<number[]>([]);
	const [initialAssignedMemberIds, setInitialAssignedMemberIds] = useState<
		number[]
	>([]);
	const [assignedSelectOpen, setAssignedSelectOpen] = useState(false);
	const [assignmentsLoading, setAssignmentsLoading] = useState(false);
	const [assignmentsError, setAssignmentsError] = useState<
		string | undefined
	>();

	const [comments, setComments] = useState<CommentDto[]>([]);
	const [commentsLoading, setCommentsLoading] = useState(false);
	const [commentsError, setCommentsError] = useState<string | undefined>();
	const [newCommentText, setNewCommentText] = useState("");
	const [addingComment, setAddingComment] = useState(false);

	const safeMembers = Array.isArray(members) ? members : [];
	const safeCategories = Array.isArray(categories) ? categories : [];

	const category = useMemo(() => {
		if (!task) return undefined;
		return safeCategories.find((c) => c.id === task.categoryId);
	}, [safeCategories, task]);

	const reminder = useMemo(
		() => getReminderStatus(task?.dueDate ?? undefined),
		[task?.dueDate],
	);

	useEffect(() => {
		if (!open || !task) {
			return;
		}

		setAssignmentsLoading(true);
		setAssignmentsError(undefined);

		void (async () => {
			try {
				const response = await listTaskAssignments(task.id);
				const ids = response.data.map((a) => a.familyMemberId);
				setAssignedMemberIds(ids);
				setInitialAssignedMemberIds(ids);
			} catch (error) {
				console.error("Failed to load task assignments", error);
				setAssignmentsError("Failed to load assignments.");
			} finally {
				setAssignmentsLoading(false);
			}
		})();
	}, [open, task]);

	useEffect(() => {
		if (!open || !task) {
			return;
		}

		setCommentsLoading(true);
		setCommentsError(undefined);

		void (async () => {
			try {
				const response = await listComments(task.id);
				setComments(response.data);
			} catch (error) {
				console.error("Failed to load comments", error);
				setCommentsError("Failed to load comments.");
			} finally {
				setCommentsLoading(false);
			}
		})();
	}, [open, task]);

	const handleSaveAssignments = async (): Promise<void> => {
		if (!task) return;

		setAssignmentsError(undefined);
		setAssignmentsLoading(true);

		try {
			const current = new Set(initialAssignedMemberIds);
			const next = new Set(assignedMemberIds);

			const toAdd: number[] = [];
			const toRemove: number[] = [];

			for (const id of next) {
				if (!current.has(id)) {
					toAdd.push(id);
				}
			}

			for (const id of current) {
				if (!next.has(id)) {
					toRemove.push(id);
				}
			}

			if (toAdd.length > 0) {
				await addTaskAssignments({
					taskId: task.id,
					familyMemberIds: toAdd,
				});
			}

			if (toRemove.length > 0) {
				await Promise.all(
					toRemove.map((id) => deleteTaskAssignment(task.id, id)),
				);
			}

			setInitialAssignedMemberIds(assignedMemberIds);

			// Close the dialog after a successful save so changes
			// are applied and the user returns to the task list.
			onClose();
		} catch (error) {
			console.error("Failed to save task assignments", error);
			setAssignmentsError("Failed to save assignments. Please try again.");
		} finally {
			setAssignmentsLoading(false);
		}
	};

	const handleAddComment = async (): Promise<void> => {
		if (!task || !newCommentText.trim()) {
			return;
		}

		setAddingComment(true);
		setCommentsError(undefined);

		try {
			const response = await createComment({
				taskId: task.id,
				text: newCommentText.trim(),
			});
			setComments((prev) => [...prev, response.data]);
			setNewCommentText("");
		} catch (error) {
			console.error("Failed to add comment", error);
			setCommentsError("Failed to add comment. Please try again.");
		} finally {
			setAddingComment(false);
		}
	};

	if (!task) {
		return null;
	}

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>Task details</DialogTitle>
			<DialogContent>
				<Box display="flex" flexDirection="column" gap={2} mt={1}>
					<Box>
						<Typography variant="h6" gutterBottom>
							{task.title}
						</Typography>
						{task.description && (
							<Typography variant="body2" color="text.secondary">
								{task.description}
							</Typography>
						)}
						<Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
							{task.dueDate && (
								<Chip
									size="small"
									label={new Date(task.dueDate).toLocaleDateString()}
									variant="outlined"
								/>
							)}
							{category && (
								<Chip
									size="small"
									label={category.name}
									variant="outlined"
									style={
										category.color
											? {
													borderColor: category.color,
													color: category.color,
												}
											: undefined
									}
								/>
							)}
							<Chip
								size="small"
								label={reminder.label}
								color={reminder.color}
								variant="outlined"
							/>
						</Stack>
					</Box>

					<Box>
						<Typography variant="subtitle1" gutterBottom>
							Assigned to
						</Typography>
						<FormControl fullWidth>
							<InputLabel id="task-assigned-members-label">
								Family members
							</InputLabel>
							<Select
								labelId="task-assigned-members-label"
								label="Family members"
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
						{assignmentsError && (
							<Typography variant="body2" color="error" mt={0.5}>
								{assignmentsError}
							</Typography>
						)}
					</Box>

					<Box>
						<Typography variant="subtitle1" gutterBottom>
							Comments
						</Typography>
						{commentsError && (
							<Typography variant="body2" color="error" mb={0.5}>
								{commentsError}
							</Typography>
						)}
						<Box
							border={1}
							borderColor="divider"
							borderRadius={1}
							p={1}
							mb={1}
							sx={{ maxHeight: 200, overflowY: "auto" }}
						>
							{commentsLoading ? (
								<Typography variant="body2" color="text.secondary">
									Loading comments...
								</Typography>
							) : comments.length === 0 ? (
								<Typography variant="body2" color="text.secondary">
									No comments yet
								</Typography>
							) : (
								<Stack spacing={1}>
									{comments.map((comment) => (
										<Box key={comment.id}>
											<Typography variant="caption" color="text.secondary">
												{comment.authorName ?? `User #${comment.userId}`} –{" "}
												{new Date(comment.createdAt).toLocaleString()}
											</Typography>
											<Typography variant="body2">{comment.text}</Typography>
										</Box>
									))}
								</Stack>
							)}
						</Box>
						<TextField
							label="Add a comment"
							fullWidth
							multiline
							minRows={2}
							value={newCommentText}
							onChange={(event) => setNewCommentText(event.target.value)}
						/>
					</Box>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
				<Button
					onClick={() => void handleAddComment()}
					disabled={addingComment || !newCommentText.trim()}
				>
					Add comment
				</Button>
				<Button
					onClick={() => void handleSaveAssignments()}
					disabled={assignmentsLoading}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
};
