import type { Response } from "express";

export interface ErrorBody {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}

export interface ListMeta {
	total?: number;
}

export interface ListResponse<T> {
	data: T[];
	meta?: ListMeta;
}

export interface SingleResponse<T> {
	data: T;
}

export const sendData = <T>(
	res: Response,
	status: number,
	data: T,
): void => {
	res.status(status).json({ data } satisfies SingleResponse<T>);
};

export const sendList = <T>(
	res: Response,
	status: number,
	data: T[],
	meta?: ListMeta,
): void => {
	res.status(status).json({ data, meta } satisfies ListResponse<T>);
};

export const sendError = (
	res: Response,
	status: number,
	code: string,
	message: string,
	details?: unknown,
): void => {
	const body: ErrorBody = {
			error: {
				code,
				message,
				...(details !== undefined ? { details } : {}),
			},
		};

	res.status(status).json(body);
};
