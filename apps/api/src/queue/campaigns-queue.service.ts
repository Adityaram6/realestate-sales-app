import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { CAMPAIGN_QUEUE } from "./queue.module";

export interface ExecuteCampaignJob {
  campaignId: string;
  userId: string;
}

export const CAMPAIGN_EXECUTE_JOB = "execute-campaign";

@Injectable()
export class CampaignsQueueService {
  private readonly logger = new Logger(CampaignsQueueService.name);

  constructor(
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue<ExecuteCampaignJob>,
  ) {}

  /**
   * Queue a campaign to execute at a specific time. BullMQ holds the job
   * in Redis until `runAt` then hands it to the processor. If the service
   * restarts, the job persists. Duplicate calls for the same campaign
   * replace the prior job via jobId.
   */
  async scheduleExecution(
    campaignId: string,
    userId: string,
    runAt: Date,
  ): Promise<void> {
    const delay = Math.max(0, runAt.getTime() - Date.now());
    await this.queue.remove(this.jobId(campaignId));
    await this.queue.add(
      CAMPAIGN_EXECUTE_JOB,
      { campaignId, userId },
      { jobId: this.jobId(campaignId), delay },
    );
    this.logger.log(
      `Scheduled campaign ${campaignId} for ${runAt.toISOString()} (delay ${delay}ms)`,
    );
  }

  async cancelScheduled(campaignId: string): Promise<void> {
    await this.queue.remove(this.jobId(campaignId));
    this.logger.log(`Cancelled scheduled run for campaign ${campaignId}`);
  }

  private jobId(campaignId: string): string {
    return `campaign:${campaignId}`;
  }
}
