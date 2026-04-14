import type { TaskCategoryDto, TaskDto } from "@family-manager/shared";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
	Box,
	Checkbox,
	Chip,
	IconButton,
	List,
	ListItem,
	ListItemSecondaryAction,
	ListItemText,
	Paper,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import type React from "react";

export interface TaskListProps {
	tasks: TaskDto[];
	categories: TaskCategoryDto[];
	onToggleCompleted: (task: TaskDto) => void;
	onEditTask: (task: TaskDto) => void;
	onDeleteTask: (task: TaskDto) => void;
	onViewDetails: (task: TaskDto) => void;
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

	// Normalize to dates without time for day-level comparison
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

export const TaskList: React.FC<TaskListProps> = ({
	tasks,
	categories,
	onToggleCompleted,
	onEditTask,
	onDeleteTask,
	onViewDetails,
}) => {
	const categoryById = new Map(categories.map((c) => [c.id, c]));

	return (
		<Paper variant="outlined">
			<List>
				{tasks.map((task) => {
					const category = categoryById.get(task.categoryId);
					const reminder = getReminderStatus(task.dueDate ?? undefined);

					return (
						<ListItem key={task.id} divider alignItems="flex-start">
							<ListItemText
								primary={
									<Box display="flex" alignItems="center" gap={1}>
										<Checkbox
											checked={task.isCompleted}
											onChange={() => onToggleCompleted(task)}
											inputProps={{
												"aria-label": `Mark ${task.title} as ${
													task.isCompleted ? "active" : "completed"
												}`,
											}}
										/>
										<Typography
											variant="subtitle1"
											sx={{
												textDecoration: task.isCompleted
													? "line-through"
													: "none",
												opacity: task.isCompleted ? 0.6 : 1,
											}}
										>
											{task.title}
										</Typography>
									</Box>
								}
								secondary={
									<Box
										component="span"
										mt={0.5}
										display="flex"
										flexDirection="column"
										gap={0.5}
									>
										{task.description && (
											<Typography
												component="span"
												variant="body2"
												color="text.secondary"
											>
												{task.description}
											</Typography>
										)}
										<Stack direction="row" spacing={0.5} flexWrap="wrap">
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
								}
							/>
							<ListItemSecondaryAction>
								<Tooltip title="View details">
									<span>
										<IconButton
											edge="end"
											onClick={() => onViewDetails(task)}
											size="small"
										>
											<VisibilityIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
								<Tooltip title="Edit task">
									<span>
										<IconButton
											edge="end"
											onClick={() => onEditTask(task)}
											size="small"
										>
											<EditIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
								<Tooltip title="Delete task">
									<span>
										<IconButton
											edge="end"
											onClick={() => onDeleteTask(task)}
											size="small"
										>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
							</ListItemSecondaryAction>
						</ListItem>
					);
				})}
			</List>
		</Paper>
	);
};
