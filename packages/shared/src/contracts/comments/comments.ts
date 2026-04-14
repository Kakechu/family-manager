export interface CommentDto {
	id: number;
	text: string;
	createdAt: string;
	taskId: number;
	userId: number;
}

export interface CreateCommentRequestDto {
	taskId: number;
	text: string;
}
