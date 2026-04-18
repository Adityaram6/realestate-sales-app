import {
  OpportunityStage,
  type Opportunity,
  type OpportunityStageHistory,
} from "@realestate/shared";

const now = Date.now();

export const opportunityStore: Opportunity[] = [
  {
    id: "opp-1",
    leadId: "lead-1",
    projectId: "prj-1",
    propertyId: "prop-1",
    stage: OpportunityStage.NEGOTIATION,
    probability: 70,
    assignedTo: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "opp-2",
    leadId: "lead-2",
    projectId: "prj-2",
    propertyId: "prop-4",
    stage: OpportunityStage.SITE_VISIT_DONE,
    probability: 55,
    assignedTo: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "opp-3",
    leadId: "lead-2",
    projectId: "prj-1",
    propertyId: null,
    stage: OpportunityStage.CONTACTED,
    probability: 30,
    assignedTo: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "opp-4",
    leadId: "lead-3",
    projectId: "prj-3",
    propertyId: null,
    stage: OpportunityStage.NEW,
    probability: 10,
    assignedTo: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "opp-5",
    leadId: "lead-4",
    projectId: "prj-1",
    propertyId: null,
    stage: OpportunityStage.SITE_VISIT_SCHEDULED,
    probability: 45,
    assignedTo: "u-2",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
  },
];

export const stageHistoryStore: OpportunityStageHistory[] = [
  {
    id: "hist-1",
    opportunityId: "opp-1",
    oldStage: null,
    newStage: OpportunityStage.NEW,
    changedBy: "u-3",
    changedAt: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "hist-2",
    opportunityId: "opp-1",
    oldStage: OpportunityStage.NEW,
    newStage: OpportunityStage.CONTACTED,
    changedBy: "u-3",
    changedAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: "hist-3",
    opportunityId: "opp-1",
    oldStage: OpportunityStage.CONTACTED,
    newStage: OpportunityStage.SITE_VISIT_SCHEDULED,
    changedBy: "u-3",
    changedAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "hist-4",
    opportunityId: "opp-1",
    oldStage: OpportunityStage.SITE_VISIT_SCHEDULED,
    newStage: OpportunityStage.SITE_VISIT_DONE,
    changedBy: "u-3",
    changedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "hist-5",
    opportunityId: "opp-1",
    oldStage: OpportunityStage.SITE_VISIT_DONE,
    newStage: OpportunityStage.NEGOTIATION,
    changedBy: "u-3",
    changedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
  },
];

export function recordStageChange(
  opportunityId: string,
  oldStage: OpportunityStage | null,
  newStage: OpportunityStage,
) {
  stageHistoryStore.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    opportunityId,
    oldStage,
    newStage,
    changedBy: "u-3",
    changedAt: new Date().toISOString(),
  });
}
