export interface TaskCategoryDto {
	id: number;
	name: string;
	color?: string | null;
}

export interface CreateTaskCategoryRequestDto {
	name: string;
	color?: string | null;
}

export interface UpdateTaskCategoryRequestDto {
	name?: string;
	color?: string | null;
}
