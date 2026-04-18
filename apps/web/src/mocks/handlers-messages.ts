import {
  MessageDirection,
  MessageStatus,
  type MessageChannel,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import {
  messageStore,
  advanceMessageLifecycle,
  type StoredMessage,
} from "@/mocks/fixtures/messages";
import type { SendMessagePayload } from "@/lib/messages-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export const messageMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/leads/:id/messages",
    handler: async ({ params }) => {
      advanceMessageLifecycle();
      const msgs = messageStore
        .filter((m) => m.leadId === params.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime(),
        );
      return { data: msgs };
    },
  },
  {
    method: "post",
    path: "/messages/send",
    handler: async ({ body }) => {
      const payload = body as SendMessagePayload;
      if (!payload?.leadId) throw httpError(400, "leadId required");
      if (!payload?.channel) throw httpError(400, "channel required");
      if (!payload?.messageText?.trim())
        throw httpError(400, "messageText required");

      const now = new Date().toISOString();
      const msg: StoredMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        leadId: payload.leadId,
        opportunityId: payload.opportunityId,
        channel: payload.channel as MessageChannel,
        direction: MessageDirection.OUTBOUND,
        messageText: payload.messageText.trim(),
        status: MessageStatus.SENT,
        sentBy: "u-3",
        createdAt: now,
      };
      messageStore.push(msg);
      return { data: msg, status: 201 };
    },
  },
];
