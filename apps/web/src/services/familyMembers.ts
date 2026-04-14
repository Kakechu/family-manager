import type { FamilyMemberDto } from "@family-manager/shared";
import { apiClient } from "./apiClient";

export interface ListFamilyMembersResponse {
	data: FamilyMemberDto[];
}

export const listFamilyMembers =
	async (): Promise<ListFamilyMembersResponse> => {
		const response =
			await apiClient.get<ListFamilyMembersResponse>("/family-members");
		return response.data;
	};
