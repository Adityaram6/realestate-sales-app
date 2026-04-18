import { Injectable, NotFoundException } from "@nestjs/common";
import type { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";

type PublicUser = Omit<User, "passwordHash">;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });
    return users.map(this.strip);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("User not found");
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    return this.strip(updated);
  }

  private strip(user: User): PublicUser {
    const { passwordHash: _pw, ...rest } = user;
    return rest;
  }
}
