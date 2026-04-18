import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaskStatus, type Task } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTaskDto,
  TaskListFiltersDto,
  UpdateTaskDto,
} from "./dto/task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: TaskListFiltersDto): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {};
    if (filters.assignedTo) where.assignedToId = filters.assignedTo;
    if (filters.status) where.status = filters.status;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.overdue) {
      where.status = TaskStatus.PENDING;
      where.dueDate = { lt: new Date() };
    }
    return this.prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
  }

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        assignedToId: dto.assignedToId ?? userId,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
      },
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.ensureExists(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
        assignedToId: dto.assignedToId,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.task.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.task.count({ where: { id } });
    if (!count) throw new NotFoundException("Task not found");
  }
}
