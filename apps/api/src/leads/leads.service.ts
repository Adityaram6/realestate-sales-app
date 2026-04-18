import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { FlowTriggerType, Prisma, type Lead } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlowsService } from "../flows/flows.service";
import {
  BulkUploadDto,
  CreateLeadDto,
  LeadListFiltersDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import type { Paginated } from "../common/dto/pagination.dto";

const DEFAULT_PAGE_SIZE = 20;

export interface DuplicateCheckResult {
  phoneMatch?: Lead;
  emailMatch?: Lead;
}

export interface BulkUploadResult {
  created: number;
  merged: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FlowsService))
    private readonly flows: FlowsService,
  ) {}

  /** Fire-and-forget trigger dispatch. Never block the primary write on flows. */
  private fireTrigger(
    trigger: FlowTriggerType,
    leadId: string,
    data?: Record<string, unknown>,
  ): void {
    this.flows
      .dispatchTrigger(trigger, leadId, data)
      .catch((err) =>
        this.logger.error(
          `Trigger ${trigger} for lead ${leadId} failed: ${(err as Error).message}`,
        ),
      );
  }

  async list(filters: LeadListFiltersDto): Promise<Paginated<Lead>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.location) {
      where.locationPreference = {
        contains: filters.location,
        mode: "insensitive",
      };
    }
    if (filters.assignedTo) where.assignedToId = filters.assignedTo;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.budgetMin != null) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: [{ budgetMax: null }, { budgetMax: { gte: filters.budgetMin } }] },
      ];
    }
    if (filters.budgetMax != null) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: [{ budgetMin: null }, { budgetMin: { lte: filters.budgetMax } }] },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { data: rows, total, page, pageSize };
  }

  async get(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async create(dto: CreateLeadDto): Promise<Lead> {
    if (!dto.consentGiven) {
      throw new BadRequestException(
        "DPDP consent must be captured before creating a lead.",
      );
    }
    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        source: dto.source,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        locationPreference: dto.locationPreference,
        tags: dto.tags ?? [],
        status: dto.status,
        assignedToId: dto.assignedToId,
        consentGiven: true,
        consentTimestamp: new Date(),
        customFields: dto.customFields ?? undefined,
      },
    });
    this.fireTrigger(FlowTriggerType.LEAD_ADDED, lead.id, {
      source: lead.source,
      status: lead.status,
    });
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    await this.get(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        // If consent is being newly granted in this update, stamp the time.
        consentTimestamp:
          dto.consentGiven === true ? new Date() : undefined,
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.get(id);
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * DPDP "Right to Erasure" — anonymizes PII in-place. Soft-deletes the
   * record AND zeroes out name / phone / email / custom fields. The row
   * stays so opportunity + message history remains referentially valid,
   * but is no longer reversibly identifiable. Also writes an audit log.
   *
   * Admin-only at the controller level.
   */
  async anonymize(id: string, performedById: string): Promise<void> {
    const existing = await this.get(id);
    const redactedSuffix = id.slice(-6).toUpperCase();
    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id },
        data: {
          name: `Anonymized Lead ${redactedSuffix}`,
          phone: `ANONYMIZED-${redactedSuffix}`,
          email: null,
          locationPreference: null,
          tags: [],
          customFields: Prisma.JsonNull,
          deletedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          entityType: "Lead",
          entityId: id,
          action: "anonymize",
          oldValue: {
            name: existing.name,
            phone: existing.phone,
            email: existing.email,
          } as unknown as Prisma.InputJsonValue,
          newValue: {
            anonymizedAt: new Date().toISOString(),
          },
          performedById,
        },
      }),
    ]);
  }

  async checkDuplicate(
    phone: string,
    email?: string,
  ): Promise<DuplicateCheckResult> {
    const result: DuplicateCheckResult = {};
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length >= 7) {
      // Case-sensitive is fine for phone; we normalized both sides.
      const all = await this.prisma.lead.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          updatedAt: true,
        },
      });
      const match = all.find(
        (l) => normalizePhone(l.phone) === normalizedPhone,
      );
      if (match) {
        result.phoneMatch = (await this.prisma.lead.findUnique({
          where: { id: match.id },
        })) as Lead;
      }
    }
    if (email) {
      const match = await this.prisma.lead.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      });
      if (match) result.emailMatch = match;
    }
    return result;
  }

  async bulkUpload(dto: BulkUploadDto): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      created: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i]!;
      if (!row.name || !row.phone) {
        result.errors.push({
          row: i + 1,
          message: "Missing required Name or Phone",
        });
        continue;
      }
      const dup = await this.checkDuplicate(row.phone, row.email);
      const existing = dup.phoneMatch ?? dup.emailMatch;

      if (existing) {
        if (row.action === "skip") {
          result.skipped += 1;
          continue;
        }
        if (row.action === "merge") {
          await this.mergeInto(existing, row);
          result.merged += 1;
          continue;
        }
      }

      await this.prisma.lead.create({
        data: {
          name: row.name,
          phone: row.phone,
          email: row.email,
          source: row.source,
          budgetMin: row.budgetMin,
          budgetMax: row.budgetMax,
          locationPreference: row.locationPreference,
          tags: row.tags ?? [],
          consentGiven: true,
          consentTimestamp: new Date(),
          customFields: row.customFields ?? undefined,
        },
      });
      result.created += 1;
    }

    return result;
  }

  // Merge rule (locked): new upload fills empty fields only; existing
  // non-empty values preserved. Log changes to audit_logs.
  private async mergeInto(
    existing: Lead,
    incoming: BulkUploadDto["rows"][number],
  ): Promise<Lead> {
    const data: Prisma.LeadUpdateInput = {};

    setIfEmpty(data, existing, "email", incoming.email);
    setIfEmpty(data, existing, "source", incoming.source);
    setIfEmpty(data, existing, "budgetMin", incoming.budgetMin);
    setIfEmpty(data, existing, "budgetMax", incoming.budgetMax);
    setIfEmpty(
      data,
      existing,
      "locationPreference",
      incoming.locationPreference,
    );
    if (!existing.tags.length && incoming.tags?.length) {
      data.tags = incoming.tags;
    }

    return this.prisma.lead.update({
      where: { id: existing.id },
      data,
    });
  }
}

function normalizePhone(p: string): string {
  return p.replace(/[^\d]/g, "").slice(-10);
}

function setIfEmpty<
  K extends keyof Lead,
  D extends Prisma.LeadUpdateInput,
>(data: D, existing: Lead, key: K & keyof D, value: Lead[K] | undefined) {
  if (value == null || value === "") return;
  const current = existing[key];
  const empty =
    current == null ||
    current === "" ||
    (Array.isArray(current) && current.length === 0);
  if (empty) {
    (data as Record<string, unknown>)[key as string] = value;
  }
}
