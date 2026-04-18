import { ActivityType } from "@realestate/shared";

export interface StoredActivity {
  id: string;
  leadId: string;
  opportunityId?: string;
  type: ActivityType;
  title: string;
  description?: string;
  durationMinutes?: number;
  outcome?: string;
  createdBy: string;
  createdAt: string;
}

const now = Date.now();

export const activityStore: StoredActivity[] = [
  {
    id: "act-1",
    leadId: "lead-1",
    opportunityId: "opp-1",
    type: ActivityType.CALL,
    title: "Discovery call",
    description:
      "30-min intro call — walked through Green Valley layout, lead asked about DTCP approval and loan tie-ups.",
    durationMinutes: 30,
    outcome: "Interested, wants site visit",
    createdBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: "act-2",
    leadId: "lead-1",
    opportunityId: "opp-1",
    type: ActivityType.NOTE,
    title: "Pre-visit prep",
    description:
      "Lead is comparing with Skyline Heights. Lead with villa plot value + infra progress vs. high-rise maintenance costs.",
    createdBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: "act-3",
    leadId: "lead-1",
    opportunityId: "opp-1",
    type: ActivityType.MEETING,
    title: "Site visit — Green Valley",
    description: "Walked plots A-01 and A-02. Lead liked A-01 (east facing).",
    durationMinutes: 90,
    outcome: "Positive — wants negotiation on A-01",
    createdBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "act-4",
    leadId: "lead-2",
    opportunityId: "opp-2",
    type: ActivityType.CALL,
    title: "Follow-up call",
    description: "Clarified club-house amenities and possession timeline.",
    durationMinutes: 15,
    outcome: "Scheduling site visit for next weekend",
    createdBy: "u-3",
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
];
