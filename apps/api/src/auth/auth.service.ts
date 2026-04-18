import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus, type User } from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { AppConfig } from "../config/configuration";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type PublicUser = Omit<User, "passwordHash">;

export interface AuthResponse {
  user: PublicUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Seed users separately; new self-registrations default to SALES. Admin
    // role must be granted via Settings by an existing admin.
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: UserRole.SALES,
        status: UserStatus.ACTIVE,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException("Account is inactive");
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.buildAuthResponse(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("User not found");
    return this.strip(user);
  }

  private buildAuthResponse(user: User): AuthResponse {
    const { secret, expiresIn, refreshSecret, refreshExpiresIn } =
      this.config.get("jwt", { infer: true });
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwt.sign(payload, {
      secret,
      expiresIn,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    return {
      user: this.strip(user),
      tokens: { accessToken, refreshToken },
    };
  }

  private strip(user: User): PublicUser {
    const { passwordHash: _pw, ...rest } = user;
    return rest;
  }
}
