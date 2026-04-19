import type { OpportunityStage } from "../enums";

// Values match the Prisma enum (UPPERCASE) to stay aligned with wire format.

export const FlowTriggerType = {
  LEAD_ADDED: "LEAD_ADDED",
  STAGE_CHANGED: "STAGE_CHANGED",
  CAMPAIGN_AUDIENCE_ADDED: "CAMPAIGN_AUDIENCE_ADDED",
  MANUAL: "MANUAL",
} as const;
export type FlowTriggerType =
  (typeof FlowTriggerType)[keyof typeof FlowTriggerType];

export const FLOW_TRIGGER_LABEL: Record<FlowTriggerType, string> = {
  LEAD_ADDED: "Lead added",
  STAGE_CHANGED: "Stage changed",
  CAMPAIGN_AUDIENCE_ADDED: "Audience added to campaign",
  MANUAL: "Manual trigger",
};

export const FlowStepType = {
  SEND_WHATSAPP: "SEND_WHATSAPP",
  SEND_EMAIL: "SEND_EMAIL",
  SEND_SMS: "SEND_SMS",
  WAIT: "WAIT",
  CREATE_TASK: "CREATE_TASK",
  CONDITION: "CONDITION",
} as const;
export type FlowStepType = (typeof FlowStepType)[keyof typeof FlowStepType];

export const FLOW_STEP_LABEL: Record<FlowStepType, string> = {
  SEND_WHATSAPP: "Send WhatsApp",
  SEND_EMAIL: "Send email",
  SEND_SMS: "Send SMS",
  WAIT: "Wait",
  CREATE_TASK: "Create task",
  CONDITION: "Condition (halt if false)",
};

export const FlowExecutionStatus = {
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
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
