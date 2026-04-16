import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFamilyMember,
	listFamilyMembers,
} from "../../services/familyMembers";
import { FamilyMembersPage } from "./FamilyMembersPage";

vi.mock("../../services/familyMembers", () => ({
	listFamilyMembers: vi.fn().mockResolvedValue({ data: [] }),
	createFamilyMember: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(listFamilyMembers).mockResolvedValue({ data: [] });
});

describe("FamilyMembersPage", () => {
	it("renders empty state when there are no family members", async () => {
		render(<FamilyMembersPage />);

		const heading = await screen.findByText(/Family members/i);
		expect(heading).toBeInTheDocument();

		const emptyText = await screen.findByText(/No family members yet/i);
		expect(emptyText).toBeInTheDocument();
	});

	it("shows validation error when required fields are missing", async () => {
		render(<FamilyMembersPage />);

		await screen.findByText(/Family members/i);

		fireEvent.click(screen.getByRole("button", { name: /Add member/i }));

		expect(
			await screen.findByText(/First name is required/i),
		).toBeInTheDocument();
		expect(createFamilyMember).not.toHaveBeenCalled();
	});

	it("adds a member and appends it to the list", async () => {
		vi.mocked(createFamilyMember).mockResolvedValueOnce({
			data: {
				id: 4,
				firstName: "Jamie",
				lastName: "Stone",
				role: "ADULT",
				dateOfBirth: "2016-05-01T00:00:00.000Z",
				familyId: 1,
				userId: null,
			},
		});

		render(<FamilyMembersPage />);
		await screen.findByText(/Family members/i);

		fireEvent.change(screen.getByLabelText(/First name/i), {
			target: { value: " Jamie " },
		});
		fireEvent.change(screen.getByLabelText(/Last name/i), {
			target: { value: " Stone " },
		});
		fireEvent.change(screen.getByLabelText(/Date of birth/i), {
			target: { value: "2016-05-01" },
		});

		fireEvent.click(screen.getByRole("button", { name: /Add member/i }));

		await waitFor(() => {
			expect(createFamilyMember).toHaveBeenCalledWith({
				firstName: "Jamie",
				lastName: "Stone",
				role: "ADULT",
				dateOfBirth: "2016-05-01T00:00:00.000Z",
			});
		});

		expect(await screen.findByText("Jamie Stone")).toBeInTheDocument();
		expect(await screen.findByText(/Family member added/i)).toBeInTheDocument();
	});

	it("shows API failure message when create fails", async () => {
		vi.mocked(createFamilyMember).mockRejectedValueOnce({
			response: {
				data: {
					error: {
						message: "Only parents can add family members",
					},
				},
			},
		});

		render(<FamilyMembersPage />);
		await screen.findByText(/Family members/i);

		fireEvent.change(screen.getByLabelText(/First name/i), {
			target: { value: "Alex" },
		});
		fireEvent.change(screen.getByLabelText(/Last name/i), {
			target: { value: "Jordan" },
		});

		fireEvent.click(screen.getByRole("button", { name: /Add member/i }));

		await waitFor(() => {
			expect(createFamilyMember).toHaveBeenCalledTimes(1);
		});

		expect(
			await screen.findByText(/Only parents can add family members/i),
		).toBeInTheDocument();
	});

	it("shows list load error and allows retry", async () => {
		vi.mocked(listFamilyMembers)
			.mockRejectedValueOnce(new Error("network"))
			.mockResolvedValueOnce({ data: [] });

		render(<FamilyMembersPage />);

		expect(
			await screen.findByText(/Failed to load family members/i),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

		expect(
			await screen.findByText(/No family members yet/i),
		).toBeInTheDocument();
	});
});
