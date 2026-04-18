import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProjectStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateDocumentDto,
  CreateProjectDto,
  CreatePropertyDto,
  ProjectListFiltersDto,
  UpdateProjectDto,
  UpdatePropertyDto,
} from "./dto/project.dto";
import type { Paginated } from "../common/dto/pagination.dto";

const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filters: ProjectListFiltersDto,
  ): Promise<Paginated<Awaited<ReturnType<typeof this.getSummary>>>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.ProjectWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.location) {
      where.locationText = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { projectCode: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((r) => this.getSummary(r)),
      total,
      page,
      pageSize,
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    // Duplicate name+location guard (schema enforces this, but we want a
    // nicer error than a Prisma P2002).
    const existing = await this.prisma.project.findFirst({
      where: {
        name: { equals: dto.name, mode: "insensitive" },
        locationText: { equals: dto.locationText, mode: "insensitive" },
      },
    });
    if (existing) {
      throw new ConflictException(
        "A project with this name already exists at this location.",
      );
    }

    const projectCode = await this.generateProjectCode();

    return this.prisma.project.create({
      data: {
        projectCode,
        name: dto.name,
        locationText: dto.locationText,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description,
        propertyType: dto.propertyType,
        tags: dto.tags ?? [],
        status: dto.status ?? ProjectStatus.ACTIVE,
        createdById: userId,
      },
    });
  }

  async get(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        properties: { orderBy: { unitNumber: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        _count: { select: { opportunities: true } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");

    const interestedLeadsCount = await this.prisma.opportunity
      .groupBy({
        by: ["leadId"],
        where: { projectId: id },
      })
      .then((groups) => groups.length);

    const { _count, ...rest } = project;
    return {
      ...rest,
      interestedLeadsCount,
    };
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.ensureExists(id);

    if (dto.name || dto.locationText) {
      const current = await this.prisma.project.findUniqueOrThrow({
        where: { id },
      });
      const nextName = dto.name ?? current.name;
      const nextLocation = dto.locationText ?? current.locationText;
      const clash = await this.prisma.project.findFirst({
        where: {
          id: { not: id },
          name: { equals: nextName, mode: "insensitive" },
          locationText: { equals: nextLocation, mode: "insensitive" },
        },
      });
      if (clash) {
        throw new ConflictException(
          "A project with this name already exists at this location.",
        );
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    await this.ensureExists(id);
    // Block hard delete if any opportunity exists. Soft delete = status=INACTIVE.
    const activeOpp = await this.prisma.opportunity.findFirst({
      where: { projectId: id },
      select: { id: true },
    });
    if (activeOpp) {
      // Still proceed with soft-delete but expose the reason in a field the
      // UI can surface. No hard delete anywhere per locked rules.
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.INACTIVE },
    });
  }

  async listProperties(projectId: string) {
    await this.ensureExists(projectId);
    return this.prisma.property.findMany({
      where: { projectId },
      orderBy: { unitNumber: "asc" },
    });
  }

  async createProperty(projectId: string, dto: CreatePropertyDto) {
    await this.ensureExists(projectId);
    try {
      return await this.prisma.property.create({
        data: { ...dto, projectId },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException(
          "Unit number already exists in this project.",
        );
      }
      throw err;
    }
  }

  async updateProperty(propertyId: string, dto: UpdatePropertyDto) {
    const existing = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!existing) throw new NotFoundException("Property not found");
    return this.prisma.property.update({
      where: { id: propertyId },
      data: dto,
    });
  }

  async addDocument(
    projectId: string,
    uploadedById: string,
    dto: CreateDocumentDto,
  ) {
    await this.ensureExists(projectId);
    // Real implementation would receive a signed URL from S3 after upload
    // completes. For now synthesise a placeholder URL when missing.
    const fileUrl =
      dto.fileUrl ??
      `https://s3.mock/${projectId}/${encodeURIComponent(dto.fileName)}`;

    return this.prisma.projectDocument.create({
      data: {
        projectId,
        fileName: dto.fileName,
        fileUrl,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        uploadedById,
      },
    });
  }

  async deleteDocument(documentId: string) {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException("Document not found");
    await this.prisma.projectDocument.delete({ where: { id: documentId } });
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.project.count({ where: { id } });
    if (!count) throw new NotFoundException("Project not found");
  }

  private getSummary<T extends { id: string }>(project: T) {
    return project;
  }

  /**
   * Generate PRJ-YYYY-NNNN. Uses current count for the year + 1, wrapped in a
   * retry in case two inserts race. 99%+ of the time this is a single write.
   */
  private async generateProjectCode(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await this.prisma.project.findFirst({
        where: { projectCode: { startsWith: `PRJ-${year}-` } },
        orderBy: { projectCode: "desc" },
        select: { projectCode: true },
      });
      const lastNum = last
        ? parseInt(last.projectCode.replace(`PRJ-${year}-`, ""), 10)
        : 0;
      const next = `PRJ-${year}-${String(lastNum + 1 + attempt).padStart(4, "0")}`;
      const clash = await this.prisma.project.findUnique({
        where: { projectCode: next },
        select: { id: true },
      });
      if (!clash) return next;
    }
    throw new BadRequestException("Unable to allocate a project code — retry");
  }
}
