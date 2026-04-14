import type { FamilyMemberDto, TaskCategoryDto } from "@family-manager/shared";
import {
	Box,
	Button,
	Chip,
	FormControlLabel,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import type React from "react";

export interface TaskHeaderProps {
	members: FamilyMemberDto[];
	categories: TaskCategoryDto[];
	selectedMemberId?: number;
	selectedCategoryId?: number;
	hideCompleted: boolean;
	onMemberFilterChange: (memberId?: number) => void;
	onCategoryFilterChange: (categoryId?: number) => void;
	onHideCompletedChange: (value: boolean) => void;
	onAddTaskClick: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
	members,
	categories,
	selectedMemberId,
	selectedCategoryId,
	hideCompleted,
	onMemberFilterChange,
	onCategoryFilterChange,
	onHideCompletedChange,
	onAddTaskClick,
}) => {
	const safeMembers = Array.isArray(members) ? members : [];
	const safeCategories = Array.isArray(categories) ? categories : [];

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
				<Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
					<Chip
						label="All members"
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
				<Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
					<Chip
						label="All categories"
						color={selectedCategoryId === undefined ? "primary" : "default"}
						variant={selectedCategoryId === undefined ? "filled" : "outlined"}
						onClick={() => onCategoryFilterChange(undefined)}
					/>
					{safeCategories.map((category) => (
						<Chip
							key={category.id}
							label={category.name}
							variant={
								selectedCategoryId === category.id ? "filled" : "outlined"
							}
							color={selectedCategoryId === category.id ? "primary" : "default"}
							onClick={() => onCategoryFilterChange(category.id)}
						/>
					))}
					<FormControlLabel
						control={
							<Switch
								checked={hideCompleted}
								onChange={(event) =>
									onHideCompletedChange(event.target.checked)
								}
								color="primary"
							/>
						}
						label="Hide completed"
					/>
				</Stack>
			</Box>

			<Button
				variant="contained"
				color="primary"
				onClick={onAddTaskClick}
				sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
			>
				Add task
			</Button>
		</Box>
	);
};
