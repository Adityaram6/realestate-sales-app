import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export const FLOW_QUEUE = "flows";
export const FLOW_ADVANCE_JOB = "advance-flow-step";

export interface AdvanceFlowJob {
  executionId: string;
}

@Injectable()
export class FlowsQueueService {
  private readonly logger = new Logger(FlowsQueueService.name);

  constructor(
    @InjectQueue(FLOW_QUEUE) private readonly queue: Queue<AdvanceFlowJob>,
  ) {}

  /**
   * Enqueue the next step for a flow execution. `delayMs` comes from the
   * WAIT step config — everything else runs with no delay.
   */
  async enqueueAdvance(executionId: string, delayMs: number): Promise<void> {
    await this.queue.add(
      FLOW_ADVANCE_JOB,
      { executionId },
      {
        // Unique job id lets us de-dupe if advance gets called twice.
        jobId: `flow-exec:${executionId}:${Date.now()}`,
        delay: Math.max(0, delayMs),
      },
    );
    this.logger.debug(
      `Enqueued advance for execution ${executionId} (delay ${delayMs}ms)`,
    );
  }
}
