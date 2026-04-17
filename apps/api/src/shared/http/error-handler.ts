import type {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from "express";
import { sendError } from "./responses";

type AsyncRouteHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => Promise<unknown>;

interface SanitizableError {
	status?: number;
	code?: string;
	message?: string;
	details?: unknown;
	expose?: boolean;
}

const isHttpStatus = (value: number): boolean => value >= 400 && value <= 599;

export const asyncHandler = (handler: AsyncRouteHandler) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(handler(req, res, next)).catch(next);
	};
};

export const apiErrorHandler: ErrorRequestHandler = (
	error,
	_req,
	res,
	next,
) => {
	if (res.headersSent) {
		next(error);
		return;
	}

	const normalizedError = (error ?? {}) as SanitizableError;
	const status =
		typeof normalizedError.status === "number" &&
		isHttpStatus(normalizedError.status)
			? normalizedError.status
			: 500;

	if (status >= 500) {
		// eslint-disable-next-line no-console
		console.error("api_unhandled_error", error);
		sendError(res, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
		return;
	}

	const code =
		typeof normalizedError.code === "string" && normalizedError.code.length > 0
			? normalizedError.code
			: "REQUEST_FAILED";
	const message =
		normalizedError.expose &&
		typeof normalizedError.message === "string" &&
		normalizedError.message.length > 0
			? normalizedError.message
			: "Request failed";

	sendError(res, status, code, message, normalizedError.details);
};
