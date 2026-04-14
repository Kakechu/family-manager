import { UserRole } from "@prisma/client";
import { Router } from "express";
import {
	type AuthenticatedRequest,
	authenticate,
	requireRole,
} from "../../middleware/auth";
import { prisma } from "../../shared/db/client";
import { sendData, sendError } from "../../shared/http/responses";
import { runFamilyReminderScheduler } from "./reminder-scheduler";

const router = Router();

router.use(authenticate);

router.post(
	"/reminders/run",
	requireRole([UserRole.PARENT]),
	async (req: AuthenticatedRequest, res) => {
		if (!req.auth) {
			sendError(res, 401, "UNAUTHORIZED", "Authentication required");
			return;
		}

		const result = await runFamilyReminderScheduler({
			prisma,
			familyId: req.auth.familyId,
		});

		// Basic observability hook for reminder runs.
		// eslint-disable-next-line no-console
		console.info("reminder_scheduler_run", {
			familyId: req.auth.familyId,
			createdTaskNotifications: result.createdTaskNotifications,
			createdEventNotifications: result.createdEventNotifications,
		});

		sendData(res, 200, result);
	},
);

export default router;
