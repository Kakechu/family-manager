export interface TaskAssignmentDto {
	taskId: number;
	familyMemberId: number;
}

export interface AddTaskAssignmentsRequestDto {
	taskId: number;
	familyMemberIds: number[];
}
