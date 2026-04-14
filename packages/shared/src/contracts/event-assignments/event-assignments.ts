export type AttendanceStatus =
	| "PENDING"
	| "ATTENDING"
	| "NOT_ATTENDING"
	| "MAYBE";

export interface EventAssignmentDto {
	eventId: number;
	familyMemberId: number;
	attendanceStatus: AttendanceStatus;
}

export interface AddEventAssignmentsRequestDto {
	eventId: number;
	familyMemberIds: number[];
}

export interface UpdateEventAssignmentRequestDto {
	attendanceStatus: AttendanceStatus;
}
