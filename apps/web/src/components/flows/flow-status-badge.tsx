import { Badge } from "@/components/ui/badge";
import {
  FlowExecutionStatus,
  FlowTriggerType,
  FLOW_TRIGGER_LABEL,
} from "@realestate/shared";

const EXEC_VARIANT: Record<
  FlowExecutionStatus,
  "default" | "success" | "destructive" | "muted"
> = {
  RUNNING: "default",
  COMPLETED: "success",
  FAILED: "destructive",
  CANCELLED: "muted",
};

export function FlowExecutionStatusBadge({
  status,
}: {
  status: FlowExecutionStatus;
}) {
  return <Badge variant={EXEC_VARIANT[status]}>{status}</Badge>;
}

export function FlowTriggerBadge({ trigger }: { trigger: FlowTriggerType }) {
  return <Badge variant="outline">{FLOW_TRIGGER_LABEL[trigger]}</Badge>;
}
