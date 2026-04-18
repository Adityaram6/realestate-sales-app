import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Integration, PipelineStage } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const REQUIRED_KEYS: Record<string, string[]> = {
  whatsapp: ["phoneNumberId", "businessAccountId", "accessToken"],
  email: ["smtpHost", "smtpPort", "fromAddress", "username"],
  // MSG91 required fields. Swap key names when switching providers.
  sms: ["authKey", "senderId", "templateId"],
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  listIntegrations(): Promise<Integration[]> {
    return this.prisma.integration.findMany({ orderBy: { type: "asc" } });
  }

  async updateIntegration(
    type: string,
    config: Record<string, string>,
  ): Promise<Integration> {
    const existing = await this.prisma.integration.findUnique({
      where: { type },
    });
    if (!existing) throw new NotFoundException("Integration not found");

    const merged = { ...(existing.config as Record<string, string>), ...config };
    const required = REQUIRED_KEYS[type] ?? [];
    const hasAll = required.every((k) => Boolean(merged[k]));
    const status =
      required.length === 0 || !hasAll ? "not_configured" : "connected";

    return this.prisma.integration.update({
      where: { type },
      data: { config: merged, status },
    });
  }

  listPipelineStages(): Promise<PipelineStage[]> {
    return this.prisma.pipelineStage.findMany({
      orderBy: { orderIndex: "asc" },
    });
  }

  async reorderStages(orderedIds: string[]): Promise<PipelineStage[]> {
    const existing = await this.prisma.pipelineStage.findMany({
      select: { id: true },
    });
    const knownIds = new Set(existing.map((s) => s.id));
    for (const id of orderedIds) {
      if (!knownIds.has(id)) {
        throw new BadRequestException(`Unknown stage id ${id}`);
      }
    }
    if (orderedIds.length !== existing.length) {
      throw new BadRequestException(
        "orderedIds must contain every existing stage exactly once",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, i) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { orderIndex: i },
        }),
      ),
    );
    return this.listPipelineStages();
  }
}
