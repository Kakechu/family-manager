import type {
	FamilyMemberDto,
	TaskCategoryDto,
	TaskDto,
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
import { listFamilyMembers } from "../../services/familyMembers";
import { listTaskAssignments } from "../../services/taskAssignments";
import { listTaskCategories } from "../../services/taskCategories";
import {
	type ListTasksParams,
	deleteTask,
	listTasks,
	updateTask,
} from "../../services/tasks";
import { TaskDetailDialog } from "./components/TaskDetailDialog";
import { TaskFormDialog } from "./components/TaskFormDialog";
import { TaskHeader } from "./components/TaskHeader";
import { TaskList } from "./components/TaskList";

interface TasksState {
	tasks: TaskDto[];
	categories: TaskCategoryDto[];
	members: FamilyMemberDto[];
	loading: boolean;
	error?: string;
}

export const TasksPage: React.FC = () => {
	const [state, setState] = useState<TasksState>({
		tasks: [],
		categories: [],
		members: [],
		loading: true,
	});

	const [selectedMemberId, setSelectedMemberId] = useState<
		number | undefined
	>();
	const [selectedCategoryId, setSelectedCategoryId] = useState<
		number | undefined
	>();
	const [hideCompleted, setHideCompleted] = useState(false);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<TaskDto | undefined>();
	const [editingAssignedMemberIds, setEditingAssignedMemberIds] = useState<
		number[] | undefined
	>();
	const [detailTask, setDetailTask] = useState<TaskDto | undefined>();
	const [successMessage, setSuccessMessage] = useState<string | undefined>();

	const loadData = useCallback(
		async (params: ListTasksParams = {}): Promise<void> => {
			setState((prev) => ({ ...prev, loading: true, error: undefined }));

			try {
				const [tasksResponse, categoriesResponse, membersResponse] =
					await Promise.all([
						listTasks(params),
						listTaskCategories(),
						listFamilyMembers(),
					]);

				setState({
					tasks: tasksResponse.data,
					categories: categoriesResponse.data,
					members: membersResponse.data,
					loading: false,
				});
			} catch (error) {
				console.error("Failed to load tasks data", error);
				setState((prev) => ({
					...prev,
					loading: false,
					// UX doc: 4.3 Error States
					// Show clear message and offer retry
					error: "Failed to load tasks. Please try again.",
				}));
			}
		},
		[],
	);

	useEffect(() => {
		void loadData({
			familyMemberId: selectedMemberId,
			categoryId: selectedCategoryId,
		});
	}, [loadData, selectedMemberId, selectedCategoryId]);

	const handleRetry = (): void => {
		void loadData({
			familyMemberId: selectedMemberId,
			categoryId: selectedCategoryId,
		});
	};

	const handleMemberFilterChange = (memberId?: number): void => {
		setSelectedMemberId(memberId);
	};

	const handleCategoryFilterChange = (categoryId?: number): void => {
		setSelectedCategoryId(categoryId);
	};

	const handleHideCompletedChange = (value: boolean): void => {
		setHideCompleted(value);
	};

	const handleToggleCompleted = async (task: TaskDto): Promise<void> => {
		const nextCompleted = !task.isCompleted;

		setState((prev) => ({
			...prev,
			tasks: prev.tasks.map((t) =>
				t.id === task.id ? { ...t, isCompleted: nextCompleted } : t,
			),
		}));

		try {
			await updateTask(task.id, { isCompleted: nextCompleted });
			setSuccessMessage(
				nextCompleted ? "Task marked as completed" : "Task marked as active",
			);
		} catch (error) {
			console.error("Failed to update task completion", error);
			// Revert on failure
			setState((prev) => ({
				...prev,
				tasks: prev.tasks.map((t) =>
					t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t,
				),
			}));
		}
	};

	const handleEditTask = (task: TaskDto): void => {
		const loadAndOpen = async (): Promise<void> => {
			try {
				const response = await listTaskAssignments(task.id);
				setEditingAssignedMemberIds(
					response.data.map((assignment) => assignment.familyMemberId),
				);
			} catch (error) {
				console.error("Failed to load task assignments for edit", error);
				setEditingAssignedMemberIds(undefined);
			}

			setEditingTask(task);
			setIsFormOpen(true);
		};

		void loadAndOpen();
	};

	const handleDeleteTask = async (task: TaskDto): Promise<void> => {
		if (!window.confirm("Delete this task?")) {
			return;
		}

		try {
			await deleteTask(task.id);
			setSuccessMessage("Task deleted");
			void loadData({
				familyMemberId: selectedMemberId,
				categoryId: selectedCategoryId,
			});
		} catch (error) {
			console.error("Failed to delete task", error);
		}
	};

	const handleViewDetails = (task: TaskDto): void => {
		setDetailTask(task);
	};

	const handleTaskSaved = (message: string): void => {
		setIsFormOpen(false);
		setEditingTask(undefined);
		setEditingAssignedMemberIds(undefined);
		setSuccessMessage(message);
		void loadData({
			familyMemberId: selectedMemberId,
			categoryId: selectedCategoryId,
		});
	};

	const visibleTasks = useMemo(() => {
		const tasks = Array.isArray(state.tasks) ? state.tasks : [];

		if (!Array.isArray(state.tasks)) {
			console.warn("TasksPage: state.tasks was not an array", state.tasks);
		}

		const filtered = hideCompleted
			? tasks.filter((task) => !task.isCompleted)
			: tasks;

		return [...filtered].sort((a, b) => {
			// Sort by due date (nulls last), then by id
			if (a.dueDate && b.dueDate) {
				const aTime = new Date(a.dueDate).getTime();
				const bTime = new Date(b.dueDate).getTime();
				if (aTime !== bTime) {
					return aTime - bTime;
				}
			}
			if (a.dueDate && !b.dueDate) return -1;
			if (!a.dueDate && b.dueDate) return 1;
			return a.id - b.id;
		});
	}, [state.tasks, hideCompleted]);

	return (
		<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
			<Box display="flex" flexDirection="column" gap={2}>
				<Typography variant="h4" component="h1">
					Tasks
				</Typography>

				<TaskHeader
					members={state.members}
					categories={state.categories}
					selectedMemberId={selectedMemberId}
					selectedCategoryId={selectedCategoryId}
					hideCompleted={hideCompleted}
					onMemberFilterChange={handleMemberFilterChange}
					onCategoryFilterChange={handleCategoryFilterChange}
					onHideCompletedChange={handleHideCompletedChange}
					onAddTaskClick={() => {
						setEditingTask(undefined);
						setIsFormOpen(true);
					}}
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
				) : visibleTasks.length === 0 ? (
					<Box mt={4} textAlign="center">
						<Typography variant="h6" gutterBottom>
							No tasks yet
						</Typography>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Organize your family chores and reminders by creating tasks.
						</Typography>
						<Button
							variant="contained"
							color="primary"
							onClick={() => {
								setEditingTask(undefined);
								setIsFormOpen(true);
							}}
						>
							Add task
						</Button>
					</Box>
				) : (
					<TaskList
						tasks={visibleTasks}
						categories={state.categories}
						onToggleCompleted={handleToggleCompleted}
						onEditTask={handleEditTask}
						onDeleteTask={handleDeleteTask}
						onViewDetails={handleViewDetails}
					/>
				)}

				<TaskFormDialog
					open={isFormOpen}
					onClose={() => {
						setIsFormOpen(false);
						setEditingTask(undefined);
						setEditingAssignedMemberIds(undefined);
					}}
					categories={state.categories}
					members={state.members}
					initialTask={editingTask}
					initialAssignedMemberIds={editingAssignedMemberIds}
					onTaskSaved={handleTaskSaved}
				/>

				<TaskDetailDialog
					open={Boolean(detailTask)}
					task={detailTask ?? null}
					members={state.members}
					categories={state.categories}
					onClose={() => setDetailTask(undefined)}
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
