import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ModuleRef } from "@nestjs/core";
import type { Job } from "bullmq";
import { FlowsService } from "../flows/flows.service";
import {
  FLOW_ADVANCE_JOB,
  FLOW_QUEUE,
  type AdvanceFlowJob,
} from "./flows-queue.service";

@Processor(FLOW_QUEUE)
export class FlowsProcessor extends WorkerHost {
  private readonly logger = new Logger(FlowsProcessor.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<AdvanceFlowJob>): Promise<{ ok: boolean }> {
    if (job.name !== FLOW_ADVANCE_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return { ok: false };
    }
    const flows = this.moduleRef.get(FlowsService, { strict: false });
    await flows.advance(job.data.executionId);
    return { ok: true };
  }
}
