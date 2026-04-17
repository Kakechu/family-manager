import type { PaginationMeta } from "@family-manager/shared";

export const buildPaginationMeta = (params: {
	page: number;
	pageSize: number;
	totalItems: number;
}): PaginationMeta => {
	return {
		page: params.page,
		pageSize: params.pageSize,
		totalItems: params.totalItems,
		totalPages:
			params.totalItems === 0 ? 0 : Math.ceil(params.totalItems / params.pageSize),
	};
};

export const getPaginationArgs = (params: {
	page: number;
	pageSize: number;
}): { skip: number; take: number } => {
	return {
		skip: (params.page - 1) * params.pageSize,
		take: params.pageSize,
	};
};
