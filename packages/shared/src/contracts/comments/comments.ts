export interface CommentDto {
	id: number;
	text: string;
	createdAt: string;
	taskId: number;
	userId: number;
	authorName?: string;
}

export interface CreateCommentRequestDto {
	taskId: number;
	text: string;
}
