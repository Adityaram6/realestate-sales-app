import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma,
  SocialPlatform,
  SocialPostStatus,
  type SocialAccount,
  type SocialPost,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ConnectSocialAccountDto,
  CreateSocialPostDto,
  SocialPostListFiltersDto,
} from "./dto/social.dto";
import type { AppConfig } from "../config/configuration";

type PublicSocialAccount = Omit<
  SocialAccount,
  "accessToken" | "refreshToken"
>;

/**
 * Social publishing service. The actual `publishToMeta()` call is a stub —
 * real Meta Graph API integration depends on Meta Business Verification +
 * app review (4–8 week lead time). The shape of this service doesn't change
 * when that ships: swap the stub for the Graph call, everything else works.
 */
@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  private readonly graphVersion: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.graphVersion = config.get("meta", { infer: true }).graphVersion;
  }

  // ---------- Accounts ----------

  async listAccounts(): Promise<PublicSocialAccount[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      orderBy: { createdAt: "desc" },
    });
    return accounts.map(this.strip);
  }

  async connect(
    userId: string,
    dto: ConnectSocialAccountDto,
  ): Promise<PublicSocialAccount> {
    try {
      const account = await this.prisma.socialAccount.create({
        data: {
          platform: dto.platform,
          accountName: dto.accountName,
          accessToken: dto.accessToken,
          refreshToken: dto.refreshToken,
          status: "connected",
          createdById: userId,
        },
      });
      return this.strip(account);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new BadRequestException(
          "This account is already connected. Disconnect it first to re-auth.",
        );
      }
      throw err;
    }
  }

  async disconnect(id: string): Promise<void> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException("Social account not found");
    await this.prisma.socialAccount.delete({ where: { id } });
  }

  // ---------- Posts ----------

  listPosts(filters: SocialPostListFiltersDto): Promise<SocialPost[]> {
    return this.prisma.socialPost.findMany({
      where: {
        platform: filters.platform,
        status: filters.status,
        campaignId: filters.campaignId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPost(dto: CreateSocialPostDto): Promise<SocialPost> {
    if (dto.socialAccountId) {
      const acc = await this.prisma.socialAccount.findUnique({
        where: { id: dto.socialAccountId },
      });
      if (!acc) throw new NotFoundException("Social account not found");
      if (acc.platform !== dto.platform) {
        throw new BadRequestException(
          "Social account platform does not match post platform.",
        );
      }
    }
    return this.prisma.socialPost.create({
      data: {
        platform: dto.platform,
        campaignId: dto.campaignId,
        socialAccountId: dto.socialAccountId,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.scheduledAt
          ? SocialPostStatus.SCHEDULED
          : SocialPostStatus.DRAFT,
      },
    });
  }

  async publish(id: string): Promise<SocialPost> {
    const post = await this.prisma.socialPost.findUnique({
      where: { id },
      include: { socialAccount: true },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status === SocialPostStatus.PUBLISHED) {
      throw new BadRequestException("Already published.");
    }
    if (!post.socialAccount) {
      throw new BadRequestException(
        "Attach a connected social account before publishing.",
      );
    }

    try {
      const externalPostId = await this.publishToProvider(
        post.platform,
        post.content,
        post.mediaUrl ?? undefined,
        post.socialAccount.accessToken,
      );
      return this.prisma.socialPost.update({
        where: { id },
        data: {
          status: SocialPostStatus.PUBLISHED,
          publishedAt: new Date(),
          externalPostId,
          errorMessage: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.prisma.socialPost.update({
        where: { id },
        data: {
          status: SocialPostStatus.FAILED,
          errorMessage: message,
        },
      });
      throw new ServiceUnavailableException(
        `Publish failed: ${message}`,
      );
    }
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.prisma.socialPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.status === SocialPostStatus.PUBLISHED) {
      throw new BadRequestException(
        "Can't delete a published post — unpublish from the platform first.",
      );
    }
    await this.prisma.socialPost.delete({ where: { id } });
  }

  // ---------- Internals ----------

  /**
   * Stub for the real Meta Graph API call. Real implementation:
   *
   *   POST https://graph.facebook.com/{graphVersion}/{pageId}/feed
   *   body: { message, link, access_token }
   *
   *   For Instagram:
   *   POST /{igUserId}/media  → creation_id
   *   POST /{igUserId}/media_publish?creation_id=…
   *
   *   For LinkedIn: ugcPosts endpoint.
   *
   * The stub returns a fake external ID so the rest of the flow exercises
   * correctly. Swap this method only when Meta Business Verification is
   * approved and the access token has the right permissions.
   */
  private async publishToProvider(
    platform: SocialPlatform,
    content: string,
    mediaUrl: string | undefined,
    _accessToken: string,
  ): Promise<string> {
    this.logger.warn(
      `[stub] Would publish to ${platform} via Graph ${this.graphVersion}: ${content.slice(0, 60)}…${mediaUrl ? " (with media)" : ""}`,
    );
    return `stub-${platform.toLowerCase()}-${Date.now()}`;
  }

  private strip(account: SocialAccount): PublicSocialAccount {
    const { accessToken: _a, refreshToken: _r, ...rest } = account;
    return rest;
  }
}
