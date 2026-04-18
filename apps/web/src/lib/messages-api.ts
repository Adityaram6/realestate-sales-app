import { apiClient } from "@/lib/api-client";
import type {
  MessageChannel,
  MessageDirection,
  MessageStatus,
} from "@realestate/shared";

export interface Message {
  id: string;
  leadId: string;
  opportunityId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  messageText: string;
  mediaUrl?: string;
  status: MessageStatus;
  sentBy?: string;
  createdAt: string;
}

export interface SendMessagePayload {
  leadId: string;
  opportunityId?: string;
  channel: MessageChannel;
  messageText: string;
}

export const messagesApi = {
  list: async (leadId: string): Promise<Message[]> => {
    const { data } = await apiClient.get<Message[]>(
      `/leads/${leadId}/messages`,
    );
    return data;
  },
  send: async (payload: SendMessagePayload): Promise<Message> => {
    const { data } = await apiClient.post<Message>(
      "/messages/send",
      payload,
    );
    return data;
  },
};
