import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { TasksPage } from "./TasksPage";

vi.mock("../../services/tasks", () => ({
	listTasks: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../services/taskCategories", () => ({
	listTaskCategories: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../services/familyMembers", () => ({
	listFamilyMembers: vi.fn().mockResolvedValue({ data: [] }),
}));

describe("TasksPage", () => {
	it("renders empty state when there are no tasks", async () => {
		render(<TasksPage />);

		const heading = await screen.findByText(/Tasks/i);
		expect(heading).toBeInTheDocument();

		const emptyText = await screen.findByText(/No tasks yet/i);
		expect(emptyText).toBeInTheDocument();
	});
});
