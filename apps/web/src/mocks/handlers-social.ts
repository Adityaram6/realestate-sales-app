import {
  SocialPostStatus,
  type SocialPost,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import type {
  ConnectSocialAccountPayload,
  CreateSocialPostPayload,
  SocialAccount,
} from "@/lib/social-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

const socialAccountStore: SocialAccount[] = [];
const socialPostStore: SocialPost[] = [];

export const socialMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/social/accounts",
    handler: async () => ({ data: socialAccountStore }),
  },
  {
    method: "post",
    path: "/social/accounts",
    handler: async ({ body }) => {
      const payload = body as ConnectSocialAccountPayload;
      if (
        socialAccountStore.some(
          (a) => a.platform === payload.platform && a.accountName === payload.accountName,
        )
      ) {
        throw httpError(
          400,
          "This account is already connected. Disconnect it first to re-auth.",
        );
      }
      const now = new Date().toISOString();
      const acc: SocialAccount = {
        id: `sa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: payload.platform,
        accountName: payload.accountName,
        status: "connected",
        createdById: "u-1",
        createdAt: now,
        updatedAt: now,
      };
      socialAccountStore.push(acc);
      return { data: acc, status: 201 };
    },
  },
  {
    method: "delete",
    path: "/social/accounts/:id",
    handler: async ({ params }) => {
      const idx = socialAccountStore.findIndex((a) => a.id === params.id);
      if (idx === -1) throw httpError(404, "Social account not found");
      socialAccountStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
  {
    method: "get",
    path: "/social/posts",
    handler: async ({ query }) => {
      let posts = [...socialPostStore];
      if (query.platform)
        posts = posts.filter((p) => p.platform === query.platform);
      if (query.status) posts = posts.filter((p) => p.status === query.status);
      if (query.campaignId)
        posts = posts.filter((p) => p.campaignId === query.campaignId);
      posts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return { data: posts };
    },
  },
  {
    method: "post",
    path: "/social/posts",
    handler: async ({ body }) => {
      const payload = body as CreateSocialPostPayload;
      const post: SocialPost = {
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: payload.platform,
        campaignId: payload.campaignId,
        content: payload.content,
        mediaUrl: payload.mediaUrl,
        scheduledAt: payload.scheduledAt,
        status: payload.scheduledAt
          ? SocialPostStatus.SCHEDULED
          : SocialPostStatus.DRAFT,
        createdAt: new Date().toISOString(),
      };
      socialPostStore.push(post);
      return { data: post, status: 201 };
    },
  },
  {
    method: "post",
    path: "/social/posts/:id/publish",
    handler: async ({ params }) => {
      const idx = socialPostStore.findIndex((p) => p.id === params.id);
      if (idx === -1) throw httpError(404, "Post not found");
      const current = socialPostStore[idx]!;
      if (current.status === SocialPostStatus.PUBLISHED) {
        throw httpError(400, "Already published");
      }
      // Meta publish stub — real call blocked by Meta Business Verification.
      const updated: SocialPost = {
        ...current,
        status: SocialPostStatus.PUBLISHED,
        publishedAt: new Date().toISOString(),
      };
      socialPostStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/social/posts/:id",
    handler: async ({ params }) => {
      const idx = socialPostStore.findIndex((p) => p.id === params.id);
      if (idx === -1) throw httpError(404, "Post not found");
      if (socialPostStore[idx]!.status === SocialPostStatus.PUBLISHED) {
        throw httpError(
          400,
          "Can't delete a published post — unpublish from the platform first.",
        );
      }
      socialPostStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
  {
    method: "post",
    path: "/leads/:id/anonymize",
    handler: async () => {
      // UI just needs a 200; mock doesn't actually mutate the frontend
      // fixtures (Phase 3 anonymization is server-side truth).
      return { data: { success: true } };
    },
  },
];

