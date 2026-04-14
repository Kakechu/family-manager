import type { FamilyMemberDto } from "@family-manager/shared";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type React from "react";

export interface CalendarHeaderProps {
	members: FamilyMemberDto[];
	selectedMemberId?: number;
	onMemberFilterChange: (memberId?: number) => void;
	onAddEventClick: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
	members,
	selectedMemberId,
	onMemberFilterChange,
	onAddEventClick,
}) => {
	const safeMembers = Array.isArray(members) ? members : [];

	return (
		<Box
			display="flex"
			flexDirection={{ xs: "column", sm: "row" }}
			gap={2}
			alignItems={{ xs: "stretch", sm: "center" }}
			justifyContent="space-between"
		>
			<Box>
				<Typography variant="h6" gutterBottom>
					Filters
				</Typography>
				<Stack direction="row" spacing={1} flexWrap="wrap">
					<Chip
						label="All"
						color={selectedMemberId === undefined ? "primary" : "default"}
						variant={selectedMemberId === undefined ? "filled" : "outlined"}
						onClick={() => onMemberFilterChange(undefined)}
					/>
					{safeMembers.map((member) => {
						const fullName = `${member.firstName} ${member.lastName}`;
						return (
							<Chip
								key={member.id}
								label={fullName}
								color={selectedMemberId === member.id ? "primary" : "default"}
								variant={selectedMemberId === member.id ? "filled" : "outlined"}
								onClick={() => onMemberFilterChange(member.id)}
							/>
						);
					})}
				</Stack>
			</Box>

			<Button
				variant="contained"
				color="primary"
				onClick={onAddEventClick}
				sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
			>
				Add event
			</Button>
		</Box>
	);
};
