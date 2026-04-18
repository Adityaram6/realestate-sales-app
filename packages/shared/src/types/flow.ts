import type { OpportunityStage } from "../enums";

export const FlowTriggerType = {
  LEAD_ADDED: "lead_added",
  STAGE_CHANGED: "stage_changed",
  CAMPAIGN_AUDIENCE_ADDED: "campaign_audience_added",
  MANUAL: "manual",
} as const;
export type FlowTriggerType =
  (typeof FlowTriggerType)[keyof typeof FlowTriggerType];

export const FLOW_TRIGGER_LABEL: Record<FlowTriggerType, string> = {
  lead_added: "Lead added",
  stage_changed: "Stage changed",
  campaign_audience_added: "Audience added to campaign",
  manual: "Manual trigger",
};

export const FlowStepType = {
  SEND_WHATSAPP: "send_whatsapp",
  SEND_EMAIL: "send_email",
  SEND_SMS: "send_sms",
  WAIT: "wait",
  CREATE_TASK: "create_task",
  CONDITION: "condition",
} as const;
export type FlowStepType = (typeof FlowStepType)[keyof typeof FlowStepType];

export const FLOW_STEP_LABEL: Record<FlowStepType, string> = {
  send_whatsapp: "Send WhatsApp",
  send_email: "Send email",
  send_sms: "Send SMS",
  wait: "Wait",
  create_task: "Create task",
  condition: "Condition (halt if false)",
};

export const FlowExecutionStatus = {
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type FlowExecutionStatus =
  (typeof FlowExecutionStatus)[keyof typeof FlowExecutionStatus];

export interface FlowStepConfig {
  // send_*
  content?: string;
  // wait
  days?: number;
  hours?: number;
  minutes?: number;
  // create_task
  title?: string;
  dueInDays?: number;
  assignedToId?: string;
  // condition
  field?: "status" | "score" | "source";
  op?: "eq" | "ne" | "gte" | "lte" | "in";
  value?: string | number;
}

export interface FlowStep {
  id: string;
  flowId: string;
  orderIndex: number;
  type: FlowStepType;
  config: FlowStepConfig;
  createdAt: string;
}

export interface CampaignFlow {
  id: string;
  name: string;
  description?: string;
  campaignId?: string;
  trigger: FlowTriggerType;
  triggerConfig?: {
    fromStage?: OpportunityStage;
    toStage?: OpportunityStage;
    scheduledAt?: string;
  };
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFlowWithRelations extends CampaignFlow {
  steps: FlowStep[];
  activeExecutions: number;
  completedExecutions: number;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  leadId: string;
  currentStepIndex: number;
  status: FlowExecutionStatus;
  triggerData?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  stepsCompleted: number;
}

export interface FlowExecutionWithRelations extends FlowExecution {
  lead: {
    id: string;
    name: string;
    phone: string;
  };
  flow: {
    id: string;
    name: string;
    trigger: FlowTriggerType;
  };
}
