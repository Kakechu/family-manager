export interface EventCategoryDto {
	id: number;
	name: string;
	color?: string | null;
}

export interface CreateEventCategoryRequestDto {
	name: string;
	color?: string | null;
}

export interface UpdateEventCategoryRequestDto {
	name?: string;
	color?: string | null;
}
