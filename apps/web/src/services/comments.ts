import type {
	CommentDto,
	CreateCommentRequestDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListCommentsResponse {
	data: CommentDto[];
}

export const listComments = async (
	taskId: number,
): Promise<ListCommentsResponse> => {
	const response = await apiClient.get<ListCommentsResponse>("/comments", {
		params: { taskId },
	});
	return response.data;
};

export interface CommentResponse {
	data: CommentDto;
}

export const createComment = async (
	payload: CreateCommentRequestDto,
): Promise<CommentResponse> => {
	const response = await apiClient.post<CommentResponse>("/comments", payload);
	return response.data;
};
