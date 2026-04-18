import type { OpportunityStage } from "../enums";

export interface Opportunity {
  id: string;
  leadId: string;
  projectId: string;
  propertyId?: string | null;
  stage: OpportunityStage;
  probability?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityWithRelations extends Opportunity {
  leadName: string;
  projectName: string;
  leadScore?: number;
  lastInteractionAt?: string;
}

export interface OpportunityStageHistory {
  id: string;
  opportunityId: string;
  oldStage: OpportunityStage | null;
  newStage: OpportunityStage;
  changedBy: string;
  changedAt: string;
}
