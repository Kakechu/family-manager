import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { CalendarPage } from "./CalendarPage";

vi.mock("../../services/events", () => ({
	listEvents: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../services/eventCategories", () => ({
	listEventCategories: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../../services/familyMembers", () => ({
	listFamilyMembers: vi.fn().mockResolvedValue({ data: [] }),
}));

describe("CalendarPage", () => {
	it("renders empty state when there are no events", async () => {
		render(<CalendarPage />);

		const heading = await screen.findByText(/Family calendar/i);
		expect(heading).toBeInTheDocument();

		const emptyText = await screen.findByText(
			/No events yet for these filters/i,
		);
		expect(emptyText).toBeInTheDocument();
	});
});
