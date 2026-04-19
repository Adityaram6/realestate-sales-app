import { Module } from "@nestjs/common";
import { FlowsService } from "./flows.service";
import { FlowsController } from "./flows.controller";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [QueueModule],
  controllers: [FlowsController],
  providers: [FlowsService],
  exports: [FlowsService],
})
export class FlowsModule {}
