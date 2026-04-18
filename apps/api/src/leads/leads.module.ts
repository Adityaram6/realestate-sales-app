import { forwardRef, Module } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { LeadsController } from "./leads.controller";
import { FlowsModule } from "../flows/flows.module";

@Module({
  imports: [forwardRef(() => FlowsModule)],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
