import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  MessageChannel,
  MessageDirection,
  MessageStatus,
  type Message,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SmsProvider } from "./providers/sms.provider";
import { SendMessageDto } from "./dto/message.dto";

/**
 * Simulates the provider (WhatsApp / email) sent → delivered → read lifecycle
 * without running a real gateway or cron. On every list fetch we advance
 * statuses in-place based on message age. In production this is replaced by
 * webhook handlers at /webhooks/whatsapp and /webhooks/email that set
 * statuses from real provider events.
 *
 * SMS is different — we have a real provider wrapper (`SmsProvider`) that
 * actually ships the message. Its status is returned by the provider, so
 * SMS messages skip the simulated lifecycle.
 */
const DELIVERED_AFTER_MS = 800;
const READ_AFTER_MS = 4000;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
  ) {}

  async listForLead(leadId: string): Promise<Message[]> {
    await this.advanceLifecycle(leadId);
    return this.prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });
  }

  async send(userId: string, dto: SendMessageDto): Promise<Message> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, deletedAt: null },
      select: { id: true, phone: true, consentGiven: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    if (!lead.consentGiven) {
      throw new NotFoundException(
        "Lead has no DPDP consent — cannot send messages.",
      );
    }

    let status: MessageStatus = MessageStatus.SENT;
    let externalId: string | undefined;

    if (dto.channel === MessageChannel.SMS) {
      const result = await this.sms.send({
        to: lead.phone,
        message: dto.messageText,
      });
      externalId = result.externalId;
      status =
        result.status === "failed"
          ? MessageStatus.FAILED
          : MessageStatus.SENT;
    }

    return this.prisma.message.create({
      data: {
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        channel: dto.channel,
        direction: MessageDirection.OUTBOUND,
        messageText: dto.messageText,
        status,
        sentById: userId,
        externalId,
      },
    });
  }

  private async advanceLifecycle(leadId: string): Promise<void> {
    const now = Date.now();
    const inFlight = await this.prisma.message.findMany({
      where: {
        leadId,
        // SMS statuses come from the provider, don't auto-advance.
        channel: { not: MessageChannel.SMS },
        direction: MessageDirection.OUTBOUND,
        status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
      },
      select: { id: true, status: true, createdAt: true },
    });

    for (const m of inFlight) {
      const ageMs = now - m.createdAt.getTime();
      if (ageMs > READ_AFTER_MS) {
        await this.prisma.message.update({
          where: { id: m.id },
          data: { status: MessageStatus.READ },
        });
      } else if (
        ageMs > DELIVERED_AFTER_MS &&
        m.status === MessageStatus.SENT
      ) {
        await this.prisma.message.update({
          where: { id: m.id },
          data: { status: MessageStatus.DELIVERED },
        });
      }
    }
  }
}
