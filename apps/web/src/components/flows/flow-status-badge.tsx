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

const EXEC_LABEL: Record<FlowExecutionStatus, string> = {
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function FlowExecutionStatusBadge({
  status,
}: {
  status: FlowExecutionStatus;
}) {
  return <Badge variant={EXEC_VARIANT[status]}>{EXEC_LABEL[status]}</Badge>;
}

export function FlowTriggerBadge({ trigger }: { trigger: FlowTriggerType }) {
  return <Badge variant="outline">{FLOW_TRIGGER_LABEL[trigger]}</Badge>;
}
