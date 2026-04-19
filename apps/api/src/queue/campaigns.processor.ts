import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ModuleRef } from "@nestjs/core";
import type { Job } from "bullmq";
import { CampaignsService } from "../campaigns/campaigns.service";
import {
  CAMPAIGN_EXECUTE_JOB,
  CAMPAIGN_QUEUE,
  type ExecuteCampaignJob,
} from "./campaigns-queue.service";

/**
 * Fetches CampaignsService at runtime via ModuleRef so we don't need to
 * import CampaignsModule — which would create a circular dependency with
 * the global QueueModule (campaigns controller injects the queue service,
 * and the processor calls the campaigns service).
 */
@Processor(CAMPAIGN_QUEUE)
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<ExecuteCampaignJob>): Promise<{ ok: boolean; queued?: number }> {
    if (job.name !== CAMPAIGN_EXECUTE_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return { ok: false };
    }

    const campaigns = this.moduleRef.get(CampaignsService, { strict: false });
    const { campaignId, userId } = job.data;
    this.logger.log(
      `Executing scheduled campaign ${campaignId} (attempt ${job.attemptsMade + 1})`,
    );
    const result = await campaigns.execute(userId, campaignId, {
      dryRun: false,
    });
    this.logger.log(
      `Campaign ${campaignId} executed: ${result.queuedMessages} queued, ${result.skipped} skipped, ${result.errors.length} errors`,
    );
    return { ok: true, queued: result.queuedMessages };
  }
}
