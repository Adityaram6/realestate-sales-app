import {
  AiIntent,
  AiTone,
  LeadStatus,
  OpportunityStage,
  type Lead,
  type OpportunityWithRelations,
  type Project,
} from "@realestate/shared";

/**
 * Mock 4-layer AI engine (Context → Intent → Compose → Output Controller).
 * Kept pure so the Nest backend can port it 1:1 and swap the compose step
 * for a real Claude call. No LLM vendor SDKs here on purpose — flip
 * NEXT_PUBLIC_USE_MOCK to false and the handlers vanish.
 */

// ---------- Layer 1: Context Builder ----------

export interface AiContext {
  lead: {
    name: string;
    budgetRange?: string;
    locationPreference?: string;
    score?: number;
    status?: LeadStatus;
    daysSinceLastUpdate: number;
  };
  project?: {
    name: string;
    type: string;
    location: string;
    tags: string[];
  };
  opportunity?: {
    stage: OpportunityStage;
    daysSinceLastStageChange: number;
  };
  interactionSummary: string[];
}

export function buildContext(input: {
  lead: Lead;
  project?: Project;
  opportunity?: OpportunityWithRelations;
}): AiContext {
  const { lead, project, opportunity } = input;

  const budgetRange =
    lead.budgetMin || lead.budgetMax
      ? formatBudget(lead.budgetMin, lead.budgetMax)
      : undefined;

  const daysSinceLastUpdate = Math.floor(
    (Date.now() - new Date(lead.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    lead: {
      name: lead.name,
      budgetRange,
      locationPreference: lead.locationPreference,
      score: lead.score,
      status: lead.status,
      daysSinceLastUpdate,
    },
    project: project
      ? {
          name: project.name,
          type: project.propertyType,
          location: project.locationText,
          tags: project.tags,
        }
      : undefined,
    opportunity: opportunity
      ? {
          stage: opportunity.stage,
          daysSinceLastStageChange: opportunity.lastInteractionAt
            ? Math.floor(
                (Date.now() -
                  new Date(opportunity.lastInteractionAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 99,
        }
      : undefined,
    // Real implementation pulls last 5 from messages + activities + stage history.
    // For now we synthesize from opportunity stage to show the shape.
    interactionSummary: opportunity
      ? [
          `Currently at ${opportunity.stage.replace(/_/g, " ")} stage`,
          opportunity.leadScore && opportunity.leadScore > 70
            ? "Engaged actively in the last week"
            : "Responses have been slow",
        ]
      : [],
  };
}

// ---------- Layer 2: Intent Engine ----------

export function decideIntent(ctx: AiContext): AiIntent {
  const opp = ctx.opportunity;
  const lead = ctx.lead;

  if (opp) {
    if (
      opp.stage === OpportunityStage.SITE_VISIT_SCHEDULED &&
      opp.daysSinceLastStageChange > 2
    ) {
      return AiIntent.SITE_VISIT;
    }
    if (
      opp.stage === OpportunityStage.NEGOTIATION ||
      (lead.score && lead.score > 80)
    ) {
      return AiIntent.NEGOTIATION;
    }
    if (opp.daysSinceLastStageChange > 7) {
      return AiIntent.RE_ENGAGEMENT;
    }
    if (opp.stage === OpportunityStage.SITE_VISIT_DONE) {
      return AiIntent.CLOSING;
    }
  }

  if (lead.daysSinceLastUpdate > 7) return AiIntent.RE_ENGAGEMENT;
  return AiIntent.FOLLOW_UP;
}

// ---------- Layer 3: Prompt Composer (message generator) ----------

export interface MessageVariation {
  approach: "soft" | "direct" | "urgency";
  tone: AiTone;
  text: string;
  scores: {
    actionability: number;
    personalization: number;
    clarity: number;
  };
}

export function composeMessages(
  ctx: AiContext,
  intent: AiIntent,
  tone: AiTone,
): MessageVariation[] {
  const firstName = ctx.lead.name.split(/\s+/)[0] ?? ctx.lead.name;
  const projectName = ctx.project?.name ?? "the project";
  const loc = ctx.project?.location ?? ctx.lead.locationPreference ?? "";
  const highlight = ctx.project?.tags[0];

  const openings: Record<AiTone, string> = {
    [AiTone.PROFESSIONAL]: `Hello ${firstName},`,
    [AiTone.FRIENDLY]: `Hi ${firstName}!`,
    [AiTone.AGGRESSIVE]: `${firstName}, quick one —`,
  };
  const open = openings[tone];

  const templates: Record<
    AiIntent,
    { soft: string; direct: string; urgency: string }
  > = {
    [AiIntent.FOLLOW_UP]: {
      soft: `${open} just checking in on your interest in ${projectName}. Any thoughts I can help with?`,
      direct: `${open} I'd love to walk you through ${projectName}${loc ? ` in ${loc}` : ""}. Can we schedule a 10-min call this week?`,
      urgency: `${open} inventory at ${projectName} is moving fast — a few units matching your preference are still available. Can we talk today?`,
    },
    [AiIntent.SITE_VISIT]: {
      soft: `${open} would you like to visit ${projectName}? Weekends or evenings work best for most of our clients.`,
      direct: `${open} let's lock in your site visit to ${projectName}. Does this Saturday at 11am work?`,
      urgency: `${open} this weekend's site visit slots at ${projectName} are almost full. Shall I reserve Saturday 11am for you?`,
    },
    [AiIntent.NEGOTIATION]: {
      soft: `${open} happy to discuss flexibility on pricing or payment plan for ${projectName}. When's a good time?`,
      direct: `${open} I can take a sharper number to my director for ${projectName}. What's the figure you have in mind?`,
      urgency: `${open} we have a limited-time offer on ${projectName} this week that I can extend to you. Can we talk today?`,
    },
    [AiIntent.CLOSING]: {
      soft: `${open} glad the site visit went well. Any final questions before we move forward with ${projectName}?`,
      direct: `${open} ready to block your unit at ${projectName}? I can share the booking form today.`,
      urgency: `${open} your preferred unit at ${projectName} has two other interested buyers. Let's finalise today if you're still keen.`,
    },
    [AiIntent.RE_ENGAGEMENT]: {
      soft: `${open} circling back on ${projectName}. Would a fresh layout or updated pricing help?`,
      direct: `${open} quick update on ${projectName}${highlight ? ` — ${highlight}` : ""}. Still a fit for what you're looking for?`,
      urgency: `${open} last week to consider ${projectName} before our next price revision. Want me to hold options for you?`,
    },
    [AiIntent.CROSS_SELL]: {
      soft: `${open} I think ${projectName} may suit you better given your budget. Open to taking a look?`,
      direct: `${open} I'd like to suggest ${projectName} as a stronger match — similar location, better value. Worth a short walkthrough?`,
      urgency: `${open} ${projectName} just opened bookings and fits your budget. Limited units — let's talk today?`,
    },
  };

  const t = templates[intent];
  const variations: MessageVariation[] = [
    { approach: "soft", tone, text: t.soft, scores: scoreText(t.soft, ctx) },
    {
      approach: "direct",
      tone,
      text: t.direct,
      scores: scoreText(t.direct, ctx),
    },
    {
      approach: "urgency",
      tone,
      text: t.urgency,
      scores: scoreText(t.urgency, ctx),
    },
  ];

  // Layer 4 (output controller) applied here.
  return variations
    .filter((v) => {
      const check = validateOutput(v.text);
      return check.ok;
    })
    .sort((a, b) => rank(b.scores) - rank(a.scores));
}

// ---------- Layer 4: Output Controller ----------

const GENERIC_PHRASES = [
  /\bhope you are doing well\b/i,
  /\bhope you're doing well\b/i,
  /\bi hope this message finds you well\b/i,
];

export function validateOutput(text: string): {
  ok: boolean;
  reason?: string;
} {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 80) return { ok: false, reason: "Exceeds 80 words" };
  for (const phrase of GENERIC_PHRASES) {
    if (phrase.test(text)) {
      return { ok: false, reason: "Generic phrasing" };
    }
  }
  return { ok: true };
}

function scoreText(text: string, ctx: AiContext) {
  const hasName = new RegExp(`\\b${ctx.lead.name.split(/\s+/)[0]}\\b`).test(
    text,
  );
  const hasProject = ctx.project
    ? new RegExp(
        ctx.project.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      ).test(text)
    : false;
  const wordCount = text.trim().split(/\s+/).length;
  const hasQuestion = /\?/.test(text);
  const hasCTA = /(visit|call|meet|schedule|book|finalise|talk|walk)/i.test(
    text,
  );

  return {
    personalization: (hasName ? 50 : 0) + (hasProject ? 50 : 0),
    actionability: (hasCTA ? 60 : 0) + (hasQuestion ? 40 : 0),
    clarity: wordCount <= 40 ? 100 : wordCount <= 60 ? 75 : 50,
  };
}

function rank(s: { actionability: number; personalization: number; clarity: number }) {
  return s.actionability + s.personalization + s.clarity;
}

// ---------- Strategist ----------

export interface StrategyOutput {
  mindset: string;
  strategy: string;
  nextAction: string;
  timing: "now" | "24h" | "weekend" | "next_week";
  riskLevel: "low" | "medium" | "high";
  conversionProbability: number;
  approach: "call" | "message" | "offer" | "site_visit";
  reasoning: string;
}

export function suggestStrategy(ctx: AiContext): StrategyOutput {
  const stage = ctx.opportunity?.stage;
  const score = ctx.lead.score ?? 50;

  if (stage === OpportunityStage.NEGOTIATION) {
    return {
      mindset: "Price-sensitive, evaluating alternatives.",
      strategy: "Hold the ceiling but offer a soft concession to close.",
      nextAction: "Get director approval on a 2% discount and present as limited-time",
      timing: "24h",
      riskLevel: score > 70 ? "low" : "medium",
      conversionProbability: Math.min(90, score + 5),
      approach: "call",
      reasoning:
        "Deal has momentum. A direct call within 24 hours keeps the negotiation framed on your terms.",
    };
  }
  if (stage === OpportunityStage.SITE_VISIT_SCHEDULED) {
    return {
      mindset: "Interested but needs reassurance on specifics.",
      strategy: "Reduce friction to the visit — logistics, directions, timing.",
      nextAction: "Share directions + contact number and confirm the visit slot",
      timing: "now",
      riskLevel: "low",
      conversionProbability: score,
      approach: "message",
      reasoning:
        "The visit is the highest-value touch in the funnel. Any drop-off here is expensive.",
    };
  }
  if (stage === OpportunityStage.SITE_VISIT_DONE) {
    return {
      mindset: "Evaluating, comparing with other options.",
      strategy: "Keep mind-share with specific unit suggestions.",
      nextAction: "Send 2 unit options with pricing + payment plan comparison",
      timing: "24h",
      riskLevel: "medium",
      conversionProbability: Math.min(80, score + 10),
      approach: "message",
      reasoning:
        "Post-visit is the narrowing window. Concrete options convert better than open-ended follow-ups.",
    };
  }
  if ((ctx.opportunity?.daysSinceLastStageChange ?? 0) > 7) {
    return {
      mindset: "Cooling off, deprioritising.",
      strategy: "Re-engage with a new hook — price update, layout release, or alternative project.",
      nextAction: "Send a re-engagement message with a fresh value hook",
      timing: "24h",
      riskLevel: "high",
      conversionProbability: Math.max(20, score - 20),
      approach: "message",
      reasoning:
        "Silence beyond a week usually means they've moved on. A novel angle is needed, not another follow-up.",
    };
  }

  return {
    mindset: "Early-stage, warming up.",
    strategy: "Build trust with context on the project and qualifying questions.",
    nextAction: "Share the project brochure and ask about their timeline",
    timing: "24h",
    riskLevel: "medium",
    conversionProbability: Math.max(25, score),
    approach: "message",
    reasoning:
      "Early-stage leads convert best when you qualify them fast and tailor the pitch.",
  };
}

// ---------- Lead Scoring ----------

export interface ScoreOutput {
  score: number;
  label: LeadStatus;
  factors: Array<{ name: string; value: string; weight: number }>;
  reasoning: string;
}

export function scoreLead(
  lead: Lead,
  opportunities: OpportunityWithRelations[],
): ScoreOutput {
  const factors: Array<{ name: string; value: string; weight: number }> = [];
  let score = 40; // baseline

  // Engagement signal: number of active opportunities
  const active = opportunities.filter(
    (o) =>
      o.stage !== OpportunityStage.CLOSED_LOST &&
      o.stage !== OpportunityStage.CLOSED_WON,
  );
  if (active.length > 0) {
    const boost = Math.min(25, active.length * 10);
    score += boost;
    factors.push({
      name: "Engagement",
      value: `${active.length} active opportunit${active.length === 1 ? "y" : "ies"}`,
      weight: boost,
    });
  }

  // Stage progression
  const advanced = opportunities.find(
    (o) =>
      o.stage === OpportunityStage.SITE_VISIT_DONE ||
      o.stage === OpportunityStage.NEGOTIATION,
  );
  if (advanced) {
    score += 15;
    factors.push({
      name: "Stage progression",
      value: `Reached ${advanced.stage.replace(/_/g, " ")}`,
      weight: 15,
    });
  }

  // Budget clarity
  if (lead.budgetMin && lead.budgetMax) {
    score += 10;
    factors.push({
      name: "Budget clarity",
      value: formatBudget(lead.budgetMin, lead.budgetMax)!,
      weight: 10,
    });
  }

  // Email reachability
  if (lead.email) {
    score += 5;
    factors.push({
      name: "Reachability",
      value: "Phone + email on file",
      weight: 5,
    });
  }

  // Freshness
  const days = Math.floor(
    (Date.now() - new Date(lead.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days > 14) {
    score -= 15;
    factors.push({
      name: "Staleness",
      value: `No update for ${days} days`,
      weight: -15,
    });
  }

  score = Math.max(0, Math.min(100, score));

  const label: LeadStatus =
    score >= 75 ? LeadStatus.HOT : score >= 40 ? LeadStatus.WARM : LeadStatus.COLD;

  return {
    score,
    label,
    factors,
    reasoning: buildScoringReasoning(label, factors),
  };
}

function buildScoringReasoning(
  label: LeadStatus,
  factors: Array<{ name: string; weight: number }>,
): string {
  const top = factors
    .slice()
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 2);
  const positives = top.filter((f) => f.weight > 0).map((f) => f.name);
  const negatives = top.filter((f) => f.weight < 0).map((f) => f.name);

  if (label === LeadStatus.HOT) {
    return `Strong signals across ${positives.join(" and ")}. Prioritise today.`;
  }
  if (label === LeadStatus.COLD) {
    return `Weak signals${
      negatives.length ? `, dragged down by ${negatives.join(" and ")}` : ""
    }. Try a re-engagement hook.`;
  }
  return `Medium intent — ${positives[0] ?? "some engagement"}. Keep nurturing.`;
}

// ---------- Shared formatters ----------

export function formatBudget(
  min?: number,
  max?: number,
): string | undefined {
  if (!min && !max) return undefined;
  const f = (n: number) =>
    n >= 10_000_000
      ? `${(n / 10_000_000).toFixed(1)} Cr`
      : n >= 100_000
        ? `${(n / 100_000).toFixed(0)}L`
        : n.toLocaleString("en-IN");
  if (min && max) return `₹${f(min)} – ₹${f(max)}`;
  if (min) return `₹${f(min)}+`;
  return `up to ₹${f(max!)}`;
}
