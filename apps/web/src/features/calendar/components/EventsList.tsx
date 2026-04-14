import type {
	EventCategoryDto,
	EventDto,
	FamilyMemberDto,
} from "@family-manager/shared";
import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import type React from "react";

export interface EventGroup {
	date: string;
	events: EventDto[];
}

export interface EventsListProps {
	groups: EventGroup[];
	categories: EventCategoryDto[];
	members: FamilyMemberDto[];
	onEventUpdated: () => void;
	onEventDeleted: () => void;
}

export const EventsList: React.FC<EventsListProps> = ({
	groups,
	categories,
	members,
	onEventUpdated,
	onEventDeleted,
}) => {
	const categoryById = new Map(categories.map((c) => [c.id, c]));
	const memberById = new Map(members.map((m) => [m.id, m]));

	const todayIso = new Date().toISOString().split("T")[0];

	return (
		<Stack spacing={2}>
			{groups.map((group) => {
				const isToday = group.date === todayIso;
				return (
					<Paper key={group.date} variant="outlined">
						<Box p={2}>
							<Stack
								direction="row"
								alignItems="center"
								justifyContent="space-between"
								mb={1}
							>
								<Typography variant="subtitle1">
									{new Date(group.date).toLocaleDateString()}
								</Typography>
								{isToday && <Chip label="Today" color="primary" size="small" />}
							</Stack>
							<Divider />
							<Stack spacing={1} mt={1}>
								{group.events.map((event) => (
									<EventListItem
										key={event.id}
										event={event}
										category={categoryById.get(event.categoryId)}
										members={members}
										memberById={memberById}
										onUpdated={onEventUpdated}
										onDeleted={onEventDeleted}
									/>
								))}
							</Stack>
						</Box>
					</Paper>
				);
			})}
		</Stack>
	);
};
