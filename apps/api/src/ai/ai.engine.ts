import {
  LeadStatus,
  OpportunityStage,
  type Lead,
  type Opportunity,
  type Project,
} from "@prisma/client";
import { AiIntent, AiTone } from "./dto/ai.dto";

/**
 * 4-layer AI engine — pure functions only. The Nest service composes
 * these, persists inputs/outputs to ai_interactions, and the real Claude
 * call replaces `composeMessages` when USE_MOCK_AI=false.
 *
 * Structure mirrors apps/web/src/lib/ai-mock.ts so the two evolve together
 * until the backend takes over.
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
  opportunity?: Opportunity & { leadScore?: number | null };
}): AiContext {
  const { lead, project, opportunity } = input;

  const budgetRange = formatBudget(
    lead.budgetMin ?? undefined,
    lead.budgetMax ?? undefined,
  );

  const daysSinceLastUpdate = Math.floor(
    (Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    lead: {
      name: lead.name,
      budgetRange,
      locationPreference: lead.locationPreference ?? undefined,
      score: lead.score ?? undefined,
      status: lead.status ?? undefined,
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
          daysSinceLastStageChange: Math.floor(
            (Date.now() - opportunity.updatedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        }
      : undefined,
    interactionSummary: opportunity
      ? [
          `Currently at ${opportunity.stage.replace(/_/g, " ").toLowerCase()} stage`,
          (opportunity.leadScore ?? lead.score ?? 0) > 70
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
      (lead.score !== undefined && lead.score > 80)
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
    professional: `Hello ${firstName},`,
    friendly: `Hi ${firstName}!`,
    aggressive: `${firstName}, quick one —`,
  };
  const open = openings[tone];

  const templates: Record<
    AiIntent,
    { soft: string; direct: string; urgency: string }
  > = {
    follow_up: {
      soft: `${open} just checking in on your interest in ${projectName}. Any thoughts I can help with?`,
      direct: `${open} I'd love to walk you through ${projectName}${loc ? ` in ${loc}` : ""}. Can we schedule a 10-min call this week?`,
      urgency: `${open} inventory at ${projectName} is moving fast — a few units matching your preference are still available. Can we talk today?`,
    },
    site_visit: {
      soft: `${open} would you like to visit ${projectName}? Weekends or evenings work best for most of our clients.`,
      direct: `${open} let's lock in your site visit to ${projectName}. Does this Saturday at 11am work?`,
      urgency: `${open} this weekend's site visit slots at ${projectName} are almost full. Shall I reserve Saturday 11am for you?`,
    },
    negotiation: {
      soft: `${open} happy to discuss flexibility on pricing or payment plan for ${projectName}. When's a good time?`,
      direct: `${open} I can take a sharper number to my director for ${projectName}. What's the figure you have in mind?`,
      urgency: `${open} we have a limited-time offer on ${projectName} this week that I can extend to you. Can we talk today?`,
    },
    closing: {
      soft: `${open} glad the site visit went well. Any final questions before we move forward with ${projectName}?`,
      direct: `${open} ready to block your unit at ${projectName}? I can share the booking form today.`,
      urgency: `${open} your preferred unit at ${projectName} has two other interested buyers. Let's finalise today if you're still keen.`,
    },
    re_engagement: {
      soft: `${open} circling back on ${projectName}. Would a fresh layout or updated pricing help?`,
      direct: `${open} quick update on ${projectName}${highlight ? ` — ${highlight}` : ""}. Still a fit for what you're looking for?`,
      urgency: `${open} last week to consider ${projectName} before our next price revision. Want me to hold options for you?`,
    },
    cross_sell: {
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

  return variations
    .filter((v) => validateOutput(v.text).ok)
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
  const firstName = ctx.lead.name.split(/\s+/)[0] ?? ctx.lead.name;
  const hasName = new RegExp(`\\b${escapeRegex(firstName)}\\b`).test(text);
  const hasProject = ctx.project
    ? new RegExp(escapeRegex(ctx.project.name), "i").test(text)
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      nextAction:
        "Get director approval on a 2% discount and present as limited-time",
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
      nextAction:
        "Share directions + contact number and confirm the visit slot",
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
      nextAction:
        "Send 2 unit options with pricing + payment plan comparison",
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
      strategy:
        "Re-engage with a new hook — price update, layout release, or alternative project.",
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
    strategy:
      "Build trust with context on the project and qualifying questions.",
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
  opportunities: Opportunity[],
): ScoreOutput {
  const factors: Array<{ name: string; value: string; weight: number }> = [];
  let score = 40;

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

  const advanced = opportunities.find(
    (o) =>
      o.stage === OpportunityStage.SITE_VISIT_DONE ||
      o.stage === OpportunityStage.NEGOTIATION,
  );
  if (advanced) {
    score += 15;
    factors.push({
      name: "Stage progression",
      value: `Reached ${advanced.stage.replace(/_/g, " ").toLowerCase()}`,
      weight: 15,
    });
  }

  if (lead.budgetMin && lead.budgetMax) {
    score += 10;
    factors.push({
      name: "Budget clarity",
      value: formatBudget(lead.budgetMin, lead.budgetMax) ?? "set",
      weight: 10,
    });
  }
  if (lead.email) {
    score += 5;
    factors.push({
      name: "Reachability",
      value: "Phone + email on file",
      weight: 5,
    });
  }

  const days = Math.floor(
    (Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
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
    reasoning: buildReasoning(label, factors),
  };
}

function buildReasoning(
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

function formatBudget(min?: number, max?: number): string | undefined {
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

// ---------- Phase 2: Marketing AI Content Engine ----------

export type MarketingPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "whatsapp_blast"
  | "email_blast";

export interface MarketingContentInput {
  platform: MarketingPlatform;
  project: {
    name: string;
    type: string;
    location: string;
    tags: string[];
    description?: string;
    priceRange?: string;
  };
  targetAudience?: string;
  tone?: AiTone;
}

export interface MarketingContentVariation {
  approach: "headline_first" | "story_first" | "benefit_first";
  content: string;
  hashtags?: string[];
  charCount: number;
}

const PLATFORM_LIMITS: Record<
  MarketingPlatform,
  { max: number }
> = {
  facebook: { max: 600 },
  instagram: { max: 500 },
  linkedin: { max: 800 },
  whatsapp_blast: { max: 350 },
  email_blast: { max: 1200 },
};

export function composeMarketingContent(
  input: MarketingContentInput,
): MarketingContentVariation[] {
  const { platform, project } = input;
  const audience = input.targetAudience ?? "prospective buyers";
  const tag = project.tags[0] ?? project.type;
  const priceLine = project.priceRange ? ` · ${project.priceRange}` : "";
  const loc = project.location;
  const limits = PLATFORM_LIMITS[platform];

  const hashtags = buildHashtags(project, platform);

  const variations: MarketingContentVariation[] = [];

  // Variation 1: Headline-first
  const headline = buildHeadlineFirst(project, audience, platform);
  variations.push({
    approach: "headline_first",
    content: truncate(headline, limits.max),
    hashtags: platformWantsHashtags(platform) ? hashtags : undefined,
    charCount: Math.min(headline.length, limits.max),
  });

  // Variation 2: Story-first
  const story = `${greetingFor(platform)}Imagine waking up to ${tag.toLowerCase()} in ${loc}. ${project.name}${priceLine} — built for families who want more than just four walls.${platformCTA(platform)}`;
  variations.push({
    approach: "story_first",
    content: truncate(story, limits.max),
    hashtags: platformWantsHashtags(platform) ? hashtags : undefined,
    charCount: Math.min(story.length, limits.max),
  });

  // Variation 3: Benefit-first
  const benefits = buildBenefitFirst(project, platform);
  variations.push({
    approach: "benefit_first",
    content: truncate(benefits, limits.max),
    hashtags: platformWantsHashtags(platform) ? hashtags : undefined,
    charCount: Math.min(benefits.length, limits.max),
  });

  // Filter out only generic-phrase variations; the 80-word rule is for 1:1
  // sales messages, not long-form marketing copy.
  return variations.filter((v) => {
    const check = validateOutput(v.content);
    return check.ok || check.reason !== "Generic phrasing";
  });
}

function buildHeadlineFirst(
  project: MarketingContentInput["project"],
  audience: string,
  platform: MarketingPlatform,
): string {
  switch (platform) {
    case "facebook":
    case "instagram":
      return `🏡 ${project.name}${project.priceRange ? ` from ${project.priceRange}` : ""} in ${project.location}. ${project.type} with ${project.tags.slice(0, 2).join(" & ") || "unmatched value"}. Tap to know more.`;
    case "linkedin":
      return `${project.name} is now open for ${audience} in ${project.location}. A ${project.type.toLowerCase()} designed with ${project.tags.slice(0, 2).join(", ") || "long-term value"} at its core. Happy to share details.`;
    case "whatsapp_blast":
      return `Hi — quick update on ${project.name} at ${project.location}. ${project.type}${project.priceRange ? `, starting ${project.priceRange}` : ""}. Want the brochure?`;
    case "email_blast":
      return `Subject: ${project.name} — ${project.type} in ${project.location}${project.priceRange ? ` from ${project.priceRange}` : ""}\n\nHi there,\n\nWe just opened bookings at ${project.name}. Key highlights: ${project.tags.slice(0, 3).join(", ") || "DTCP approved, premium layout"}.\n\nReply to this email for the full layout + pricing sheet.\n\n— Team`;
  }
}

function buildBenefitFirst(
  project: MarketingContentInput["project"],
  platform: MarketingPlatform,
): string {
  const tags =
    project.tags.length > 0
      ? project.tags
      : ["DTCP Approved", "Gated", "Investor Pick"];
  if (platform === "email_blast") {
    return `Subject: 3 reasons ${project.name} is moving fast\n\n1. ${tags[0]}\n2. ${tags[1] ?? "Premium layout"}\n3. ${tags[2] ?? "Limited units"}\n\nLocation: ${project.location}${project.priceRange ? `\nPrice: ${project.priceRange}` : ""}\n\nWant a site visit this weekend? Just reply yes.`;
  }
  if (platform === "linkedin") {
    return `3 reasons investors are watching ${project.name}:\n\n→ ${tags[0]}\n→ ${tags[1] ?? "Premium location in " + project.location}\n→ ${tags[2] ?? "Strong appreciation corridor"}\n\nDM if you want the project deck.`;
  }
  return `Why ${project.name}? ${tags.slice(0, 3).join(" · ")}. Located in ${project.location}. ${platformCTA(platform).trim()}`;
}

function platformCTA(platform: MarketingPlatform): string {
  switch (platform) {
    case "facebook":
    case "instagram":
      return " Book a visit this weekend — link in bio.";
    case "linkedin":
      return " Comment or DM for a detailed brief.";
    case "whatsapp_blast":
      return " Reply YES for brochure + price sheet.";
    case "email_blast":
      return " Reply to this email to schedule a call.";
  }
}

function greetingFor(platform: MarketingPlatform): string {
  return platform === "email_blast" ? "" : "✨ ";
}

function platformWantsHashtags(platform: MarketingPlatform): boolean {
  return (
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "linkedin"
  );
}

function buildHashtags(
  project: MarketingContentInput["project"],
  platform: MarketingPlatform,
): string[] {
  const base = [
    project.name.replace(/\s+/g, ""),
    project.location.split(",")[0]?.replace(/\s+/g, "") ?? "",
    project.type.replace(/\s+/g, ""),
    "RealEstate",
  ].filter(Boolean);
  if (platform === "instagram") {
    base.push("DreamHome", "InvestmentOpportunity", "PropertyGoals");
  } else if (platform === "linkedin") {
    base.push("RealEstateInvesting", "PropertyTrends");
  }
  return base.map((h) => `#${h}`);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
