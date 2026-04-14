import type {
	EventCategoryDto,
	EventDto,
	FamilyMemberDto,
} from "@family-manager/shared";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
	Box,
	Chip,
	IconButton,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import type React from "react";
import { useMemo, useState } from "react";
import {
	addEventAssignments,
	deleteEventAssignment,
	listEventAssignments,
} from "../../../services/eventAssignments";
import { deleteEvent } from "../../../services/events";
import { EventFormDialog } from "./EventFormDialog";

export interface EventListItemProps {
	event: EventDto;
	category?: EventCategoryDto;
	categories: EventCategoryDto[];
	members: FamilyMemberDto[];
	memberById: Map<number, FamilyMemberDto>;
	onUpdated: () => void;
	onDeleted: () => void;
}

export const EventListItem: React.FC<EventListItemProps> = ({
	event,
	category,
	categories,
	members,
	memberById,
	onUpdated,
	onDeleted,
}) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const [assignedMemberIds, setAssignedMemberIds] = useState<number[]>([]);
	const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

	const start = useMemo(() => new Date(event.startTime), [event.startTime]);
	const end = useMemo(() => new Date(event.endTime), [event.endTime]);

	const isUpcoming = useMemo(() => {
		const now = new Date();
		const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		return start >= now && start <= in24h;
	}, [start]);

	const handleEditClick = async (): Promise<void> => {
		if (!assignmentsLoaded) {
			try {
				const response = await listEventAssignments(event.id);
				setAssignedMemberIds(response.data.map((a) => a.familyMemberId));
			} catch (error) {
				console.error("Failed to load event assignments", error);
			} finally {
				setAssignmentsLoaded(true);
			}
		}
		setIsDialogOpen(true);
	};

	const handleDelete = async (): Promise<void> => {
		// Simple confirmation for now, can be replaced by MUI dialog if needed
		// UX doc: destructive actions require confirmation
		// Using window.confirm keeps implementation lightweight for MVP
		if (!window.confirm("Delete this event?")) {
			return;
		}

		setIsDeleting(true);
		try {
			await deleteEvent(event.id);
			onDeleted();
		} catch (error) {
			console.error("Failed to delete event", error);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSave = async (
		updated: Partial<EventDto>,
		selectedMemberIds: number[],
	): Promise<void> => {
		// Event update is handled by parent dialog; here we only manage assignments
		try {
			if (!assignmentsLoaded) {
				const response = await listEventAssignments(event.id);
				setAssignedMemberIds(response.data.map((a) => a.familyMemberId));
			}

			const currentIds = new Set(assignedMemberIds);
			const nextIds = new Set(selectedMemberIds);

			const toAdd: number[] = [];
			const toRemove: number[] = [];

			for (const id of nextIds) {
				if (!currentIds.has(id)) {
					toAdd.push(id);
				}
			}

			for (const id of currentIds) {
				if (!nextIds.has(id)) {
					toRemove.push(id);
				}
			}

			if (toAdd.length > 0) {
				await addEventAssignments({
					eventId: event.id,
					familyMemberIds: toAdd,
				});
			}

			await Promise.all(
				toRemove.map((id) => deleteEventAssignment(event.id, id)),
			);

			setAssignedMemberIds(selectedMemberIds);
			onUpdated();
		} catch (error) {
			console.error("Failed to update event assignments", error);
		}
	};

	const assignedMembers = assignedMemberIds
		.map((id) => memberById.get(id))
		.filter((m): m is FamilyMemberDto => Boolean(m));

	return (
		<Box display="flex" alignItems="center" justifyContent="space-between">
			<Box>
				<Typography variant="subtitle1">{event.title}</Typography>
				<Typography variant="body2" color="text.secondary">
					{start.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}{" "}
					–{" "}
					{end.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</Typography>
				<Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
					{category && (
						<Chip
							label={category.name}
							variant="outlined"
							style={
								category.color
									? { borderColor: category.color, color: category.color }
									: undefined
							}
							size="small"
						/>
					)}
					{assignedMembers.map((member) => (
						<Chip
							key={member.id}
							label={`${member.firstName} ${member.lastName}`}
							size="small"
						/>
					))}
					{isUpcoming && (
						<Chip label="Upcoming" color="secondary" size="small" />
					)}
				</Box>
			</Box>
			<Box>
				<Tooltip title="Edit event">
					<span>
						<IconButton onClick={() => void handleEditClick()} size="small">
							<EditIcon fontSize="small" />
						</IconButton>
					</span>
				</Tooltip>
				<Tooltip title="Delete event">
					<span>
						<IconButton
							onClick={() => void handleDelete()}
							size="small"
							disabled={isDeleting}
						>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</span>
				</Tooltip>
			</Box>
			<EventFormDialog
				open={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				categories={categories}
				members={members}
				initialEvent={event}
				initialAssignedMemberIds={assignedMemberIds}
				onEventSaved={async (_message, selectedIds) => {
					setIsDialogOpen(false);
					setAssignedMemberIds(selectedIds);
					setAssignmentsLoaded(true);
					onUpdated();
				}}
			/>
		</Box>
	);
};
