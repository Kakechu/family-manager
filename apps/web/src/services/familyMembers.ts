import type {
	CreateFamilyMemberRequestDto,
	FamilyMemberDto,
} from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListFamilyMembersResponse {
	data: FamilyMemberDto[];
}

export interface CreateFamilyMemberResponse {
	data: FamilyMemberDto;
}

export const listFamilyMembers =
	async (): Promise<ListFamilyMembersResponse> => {
		const response =
			await apiClient.get<ListFamilyMembersResponse>("/family-members");
		return response.data;
	};

export const createFamilyMember = async (
	payload: CreateFamilyMemberRequestDto,
): Promise<CreateFamilyMemberResponse> => {
	const response = await apiClient.post<CreateFamilyMemberResponse>(
		"/family-members",
		payload,
	);
	return response.data;
};
