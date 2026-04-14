export interface EventDto {
	id: number;
	title: string;
	description?: string | null;
	startTime: string;
	endTime: string;
	categoryId: number;
	createdBy: number;
	familyId: number;
}

export interface CreateEventRequestDto {
	title: string;
	description?: string | null;
	startTime: string;
	endTime: string;
	categoryId: number;
}

export interface UpdateEventRequestDto {
	title?: string;
	description?: string | null;
	startTime?: string;
	endTime?: string;
	categoryId?: number;
}
