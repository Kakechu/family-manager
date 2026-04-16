import type { TaskDto } from "@family-manager/shared";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { TaskFormDialog } from "./TaskFormDialog";

const category = { id: 1, name: "Chores", color: "#00897b" };
const member = {
	id: 1,
	firstName: "Jamie",
	lastName: "Doe",
	role: "ADULT" as const,
	familyId: 1,
};

const firstTask: TaskDto = {
	id: 10,
	title: "Take out trash",
	description: "Before 8pm",
	dueDate: "2026-04-20T00:00:00.000Z",
	isCompleted: false,
	recurrenceType: "NONE",
	categoryId: 1,
	createdBy: 2,
	familyId: 1,
};

const secondTask: TaskDto = {
	id: 11,
	title: "Walk dog",
	description: "Evening walk",
	dueDate: "2026-04-22T00:00:00.000Z",
	isCompleted: false,
	recurrenceType: "DAILY",
	categoryId: 1,
	createdBy: 2,
	familyId: 1,
};

describe("TaskFormDialog", () => {
	it("hydrates form values when edit task changes", () => {
		const { rerender } = render(
			<TaskFormDialog
				open={true}
				onClose={vi.fn()}
				categories={[category]}
				members={[member]}
				initialTask={undefined}
				initialAssignedMemberIds={[]}
				onTaskSaved={vi.fn()}
			/>,
		);

		rerender(
			<TaskFormDialog
				open={true}
				onClose={vi.fn()}
				categories={[category]}
				members={[member]}
				initialTask={firstTask}
				initialAssignedMemberIds={[1]}
				onTaskSaved={vi.fn()}
			/>,
		);

		expect(screen.getByDisplayValue("Take out trash")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Before 8pm")).toBeInTheDocument();
		expect(screen.getByDisplayValue("2026-04-20")).toBeInTheDocument();

		rerender(
			<TaskFormDialog
				open={true}
				onClose={vi.fn()}
				categories={[category]}
				members={[member]}
				initialTask={secondTask}
				initialAssignedMemberIds={[1]}
				onTaskSaved={vi.fn()}
			/>,
		);

		expect(screen.getByDisplayValue("Walk dog")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Evening walk")).toBeInTheDocument();
		expect(screen.getByDisplayValue("2026-04-22")).toBeInTheDocument();
	});
});
