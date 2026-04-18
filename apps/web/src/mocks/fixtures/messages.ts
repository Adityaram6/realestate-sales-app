import {
  MessageChannel,
  MessageDirection,
  MessageStatus,
  type MessageChannel as MessageChannelT,
  type MessageDirection as MessageDirectionT,
  type MessageStatus as MessageStatusT,
} from "@realestate/shared";

export interface StoredMessage {
  id: string;
  leadId: string;
  opportunityId?: string;
  channel: MessageChannelT;
  direction: MessageDirectionT;
  messageText: string;
  mediaUrl?: string;
  status: MessageStatusT;
  sentBy?: string;
  createdAt: string;
}

const now = Date.now();

export const messageStore: StoredMessage[] = [
  {
    id: "msg-1",
    leadId: "lead-1",
    opportunityId: "opp-1",
    channel: MessageChannel.WHATSAPP,
    direction: MessageDirection.OUTBOUND,
    messageText:
      "Hi Ravi, sending across the Green Valley brochure + plot map. Let me know a time to walk through these.",
    status: MessageStatus.READ,
    sentBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
  {
    id: "msg-2",
    leadId: "lead-1",
    opportunityId: "opp-1",
    channel: MessageChannel.WHATSAPP,
    direction: MessageDirection.INBOUND,
    messageText: "Thanks, will go through. Is the price negotiable?",
    status: MessageStatus.READ,
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8 - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "msg-3",
    leadId: "lead-1",
    opportunityId: "opp-1",
    channel: MessageChannel.WHATSAPP,
    direction: MessageDirection.OUTBOUND,
    messageText:
      "Happy to discuss — block 10 mins tomorrow? Will walk you through the best options.",
    status: MessageStatus.READ,
    sentBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: "msg-4",
    leadId: "lead-2",
    opportunityId: "opp-2",
    channel: MessageChannel.WHATSAPP,
    direction: MessageDirection.INBOUND,
    messageText: "Will visit this Saturday for the 4BHK. Please share address.",
    status: MessageStatus.READ,
    createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "msg-5",
    leadId: "lead-2",
    opportunityId: "opp-2",
    channel: MessageChannel.WHATSAPP,
    direction: MessageDirection.OUTBOUND,
    messageText:
      "Perfect. Address + Google Maps pin shared. Meet our sales lead Priya at the site office.",
    status: MessageStatus.DELIVERED,
    sentBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
  },
];

/**
 * Simulate the sent → delivered → read lifecycle without a background
 * job. Called on every list read so timestamps drive status progression.
 */
export function advanceMessageLifecycle(): void {
  const t = Date.now();
  for (const m of messageStore) {
    if (m.direction !== MessageDirection.OUTBOUND) continue;
    if (m.status === MessageStatus.FAILED || m.status === MessageStatus.READ) continue;
    const ageMs = t - new Date(m.createdAt).getTime();
    if (ageMs > 4000) {
      m.status = MessageStatus.READ;
    } else if (ageMs > 800 && m.status === MessageStatus.SENT) {
      m.status = MessageStatus.DELIVERED;
    }
  }
}
