import type { TaskCategoryDto } from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListTaskCategoriesResponse {
	data: TaskCategoryDto[];
}

export const listTaskCategories =
	async (): Promise<ListTaskCategoriesResponse> => {
		const response =
			await apiClient.get<ListTaskCategoriesResponse>("/task-categories");
		return response.data;
	};
