import { leadStore } from "@/mocks/fixtures/leads";
import { projectStore } from "@/mocks/fixtures/projects";
import {
  opportunityStore,
  stageHistoryStore,
} from "@/mocks/fixtures/opportunities";
import { activityStore } from "@/mocks/fixtures/activities";
import { messageStore } from "@/mocks/fixtures/messages";
import {
  MessageDirection,
  OPPORTUNITY_STAGE_LABEL,
  OpportunityStage,
  ProjectStatus,
} from "@realestate/shared";

export function computeDashboardMetrics() {
  const totalLeads = leadStore.length;

  const activeOpportunities = opportunityStore.filter(
    (o) =>
      o.stage !== OpportunityStage.CLOSED_WON &&
      o.stage !== OpportunityStage.CLOSED_LOST,
  ).length;

  const closedOpportunities = opportunityStore.filter(
    (o) =>
      o.stage === OpportunityStage.CLOSED_WON ||
      o.stage === OpportunityStage.CLOSED_LOST,
  );
  const won = opportunityStore.filter(
    (o) => o.stage === OpportunityStage.CLOSED_WON,
  ).length;
  const conversionRate =
    closedOpportunities.length > 0
      ? Math.round((won / closedOpportunities.length) * 1000) / 10
      : 0;

  // Leads per project — count DISTINCT leads per project via opportunities.
  const byProject = new Map<string, Set<string>>();
  for (const opp of opportunityStore) {
    if (!byProject.has(opp.projectId)) byProject.set(opp.projectId, new Set());
    byProject.get(opp.projectId)!.add(opp.leadId);
  }
  const leadsPerProject = Array.from(byProject.entries())
    .map(([projectId, leadIds]) => ({
      projectName:
        projectStore.find((p) => p.id === projectId)?.name ?? "Unknown",
      count: leadIds.size,
    }))
    .filter(
      (row) =>
        projectStore.find(
          (p) => p.name === row.projectName && p.status !== ProjectStatus.INACTIVE,
        ) != null,
    )
    .sort((a, b) => b.count - a.count);

  // Recent activity — merge latest stage changes, activities, and inbound messages.
  const recent: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }> = [];

  for (const h of stageHistoryStore.slice(-5)) {
    const opp = opportunityStore.find((o) => o.id === h.opportunityId);
    if (!opp) continue;
    const lead = leadStore.find((l) => l.id === opp.leadId);
    const project = projectStore.find((p) => p.id === opp.projectId);
    if (!lead || !project) continue;
    recent.push({
      id: `stage-${h.id}`,
      type: "stage_change",
      description: `${lead.name} → ${OPPORTUNITY_STAGE_LABEL[h.newStage]} on ${project.name}`,
      createdAt: h.changedAt,
    });
  }

  for (const a of activityStore.slice(-5)) {
    const lead = leadStore.find((l) => l.id === a.leadId);
    if (!lead) continue;
    recent.push({
      id: `act-${a.id}`,
      type: a.type,
      description: `${a.title} · ${lead.name}`,
      createdAt: a.createdAt,
    });
  }

  for (const m of messageStore.slice(-5)) {
    if (m.direction !== MessageDirection.INBOUND) continue;
    const lead = leadStore.find((l) => l.id === m.leadId);
    if (!lead) continue;
    recent.push({
      id: `msg-${m.id}`,
      type: "whatsapp",
      description: `Inbound ${m.channel} from ${lead.name}`,
      createdAt: m.createdAt,
    });
  }

  recent.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    totalLeads,
    activeOpportunities,
    conversionRate,
    leadsPerProject: leadsPerProject.slice(0, 6),
    recentActivity: recent.slice(0, 6),
  };
}
