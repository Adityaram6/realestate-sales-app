import { apiClient } from "@/lib/api-client";
import type { SocialPlatform, SocialPost, SocialPostStatus } from "@realestate/shared";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectSocialAccountPayload {
  platform: SocialPlatform;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
}

export interface CreateSocialPostPayload {
  platform: SocialPlatform;
  campaignId?: string;
  socialAccountId?: string;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
}

export interface SocialPostListFilters {
  platform?: SocialPlatform;
  status?: SocialPostStatus;
  campaignId?: string;
}

export const socialApi = {
  listAccounts: async (): Promise<SocialAccount[]> => {
    const { data } = await apiClient.get<SocialAccount[]>("/social/accounts");
    return data;
  },
  connect: async (payload: ConnectSocialAccountPayload): Promise<SocialAccount> => {
    const { data } = await apiClient.post<SocialAccount>(
      "/social/accounts",
      payload,
    );
    return data;
  },
  disconnect: async (id: string): Promise<void> => {
    await apiClient.delete(`/social/accounts/${id}`);
  },
  listPosts: async (filters: SocialPostListFilters = {}): Promise<SocialPost[]> => {
    const { data } = await apiClient.get<SocialPost[]>("/social/posts", {
      params: filters,
    });
    return data;
  },
  createPost: async (payload: CreateSocialPostPayload): Promise<SocialPost> => {
    const { data } = await apiClient.post<SocialPost>(
      "/social/posts",
      payload,
    );
    return data;
  },
  publishPost: async (id: string): Promise<SocialPost> => {
    const { data } = await apiClient.post<SocialPost>(
      `/social/posts/${id}/publish`,
    );
    return data;
  },
  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/social/posts/${id}`);
  },
};
