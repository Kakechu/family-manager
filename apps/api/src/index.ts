import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRouter from "./modules/auth/routes";
import commentsRouter from "./modules/comments/routes";
import eventAssignmentsRouter from "./modules/event-assignments/routes";
import eventCategoriesRouter from "./modules/event-categories/routes";
import eventsRouter from "./modules/events/routes";
import familyMembersRouter from "./modules/family-members/routes";
import notificationsRouter from "./modules/notifications/routes";
import taskAssignmentsRouter from "./modules/task-assignments/routes";
import taskCategoriesRouter from "./modules/task-categories/routes";
import tasksRouter from "./modules/tasks/routes";
import { apiErrorHandler } from "./shared/http/error-handler";

export const createApp = () => {
	const app = express();

	app.use(
		cors({
			origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
			credentials: true,
		}),
	);
	app.use(express.json());
	app.use(cookieParser());

	app.get("/health", (_req, res) => {
		res.json({ status: "ok" });
	});

	app.use("/api/v1/auth", authRouter);
	app.use("/api/v1/comments", commentsRouter);
	app.use("/api/v1/family-members", familyMembersRouter);
	app.use("/api/v1/events", eventsRouter);
	app.use("/api/v1/event-categories", eventCategoriesRouter);
	app.use("/api/v1/event-assignments", eventAssignmentsRouter);
	app.use("/api/v1/notifications", notificationsRouter);
	app.use("/api/v1/tasks", tasksRouter);
	app.use("/api/v1/task-categories", taskCategoriesRouter);
	app.use("/api/v1/task-assignments", taskAssignmentsRouter);

	// Terminal app-level fallback for routers that do not mount their own handler.
	app.use(apiErrorHandler);

	return app;
};

const app = createApp();

const port = process.env.PORT ?? 4000;

if (process.env.NODE_ENV !== "test") {
	app.listen(port, () => {
		// eslint-disable-next-line no-console
		console.log(`API server listening on port ${port}`);
	});
}
