import type { EventCategoryDto } from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListEventCategoriesResponse {
	data: EventCategoryDto[];
}

export const listEventCategories =
	async (): Promise<ListEventCategoriesResponse> => {
		const response =
			await apiClient.get<ListEventCategoriesResponse>("/event-categories");
		return response.data;
	};
