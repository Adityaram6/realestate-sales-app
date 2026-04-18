/**
 * Seeds the dev database with the same demo data the frontend uses in mock
 * mode. Safe to re-run — clears dependent tables first.
 *
 * Usage:
 *   pnpm --filter api db:seed
 */
import {
  ActivityType,
  CampaignAudienceStatus,
  CampaignMessageStatus,
  CampaignStatus,
  CampaignType,
  LeadStatus,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  OpportunityStage,
  PrismaClient,
  ProjectStatus,
  PropertyStatus,
  TaskStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const PASSWORD = "password";

async function main() {
  console.log("🌱 Seeding database…");

  // Clear in dependency-safe order.
  await prisma.opportunityStageHistory.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.message.deleteMany();
  await prisma.task.deleteMany();
  await prisma.campaignMessage.deleteMany();
  await prisma.campaignAudience.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.property.deleteMany();
  await prisma.project.deleteMany();
  await prisma.leadScore.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  const [admin, manager, sales] = await Promise.all([
    prisma.user.create({
      data: {
        id: "u-1",
        name: "Priya Admin",
        email: "admin@demo.com",
        phone: "+91 9000000001",
        passwordHash: hash,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        id: "u-2",
        name: "Ravi Manager",
        email: "manager@demo.com",
        phone: "+91 9000000002",
        passwordHash: hash,
        role: UserRole.MANAGER,
      },
    }),
    prisma.user.create({
      data: {
        id: "u-3",
        name: "Sita Sales",
        email: "sales@demo.com",
        phone: "+91 9000000003",
        passwordHash: hash,
        role: UserRole.SALES,
      },
    }),
  ]);

  console.log(`  ✓ Users (${admin.name}, ${manager.name}, ${sales.name})`);

  const green = await prisma.project.create({
    data: {
      projectCode: "PRJ-2026-0001",
      name: "Green Valley",
      description:
        "Premium gated community of villa plots with 40 ft roads, rainwater harvesting, and 24/7 security.",
      locationText: "Anandapuram, Visakhapatnam",
      latitude: 17.8543,
      longitude: 83.3142,
      propertyType: "Villa Plots",
      tags: ["DTCP Approved", "Near Highway", "Gated"],
      status: ProjectStatus.ACTIVE,
      createdById: admin.id,
    },
  });
  const skyline = await prisma.project.create({
    data: {
      projectCode: "PRJ-2026-0002",
      name: "Skyline Heights",
      description: "3 & 4 BHK apartments in the heart of Madhurawada.",
      locationText: "Madhurawada, Visakhapatnam",
      latitude: 17.8174,
      longitude: 83.3697,
      propertyType: "Apartments",
      tags: ["RERA Approved", "Ready to Move"],
      status: ProjectStatus.ACTIVE,
      createdById: admin.id,
    },
  });
  const palm = await prisma.project.create({
    data: {
      projectCode: "PRJ-2026-0003",
      name: "Palm Grove",
      description: "Farm plots with managed coconut and mango orchards.",
      locationText: "Bheemili, Visakhapatnam",
      propertyType: "Farm Land",
      tags: ["Farm Land"],
      status: ProjectStatus.DRAFT,
      createdById: admin.id,
    },
  });

  console.log("  ✓ Projects (3)");

  const [propA1, _propA2, _propB5, propT2] = await Promise.all([
    prisma.property.create({
      data: {
        projectId: green.id,
        unitNumber: "A-01",
        size: 240,
        sizeUnit: "sqyd",
        price: 4_800_000,
        facing: "East",
        status: PropertyStatus.AVAILABLE,
      },
    }),
    prisma.property.create({
      data: {
        projectId: green.id,
        unitNumber: "A-02",
        size: 300,
        sizeUnit: "sqyd",
        price: 6_000_000,
        facing: "North",
        status: PropertyStatus.RESERVED,
      },
    }),
    prisma.property.create({
      data: {
        projectId: green.id,
        unitNumber: "B-05",
        size: 267,
        sizeUnit: "sqyd",
        price: 5_200_000,
        facing: "West",
        status: PropertyStatus.SOLD,
      },
    }),
    prisma.property.create({
      data: {
        projectId: skyline.id,
        unitNumber: "T2-1203",
        size: 1485,
        sizeUnit: "sqft",
        price: 11_500_000,
        facing: "East",
        status: PropertyStatus.AVAILABLE,
      },
    }),
  ]);

  console.log("  ✓ Properties (4)");

  await Promise.all([
    prisma.projectDocument.create({
      data: {
        projectId: green.id,
        fileName: "Green Valley — Brochure.pdf",
        fileUrl: "https://s3.mock/green-valley-brochure.pdf",
        fileType: "brochure",
        fileSize: 2_450_000,
        mimeType: "application/pdf",
        version: 1,
        uploadedById: admin.id,
      },
    }),
    prisma.projectDocument.create({
      data: {
        projectId: green.id,
        fileName: "Master Layout.jpg",
        fileUrl: "https://s3.mock/master-layout.jpg",
        fileType: "layout",
        fileSize: 1_200_000,
        mimeType: "image/jpeg",
        version: 2,
        uploadedById: admin.id,
      },
    }),
  ]);

  const now = Date.now();
  const day = 1000 * 60 * 60 * 24;

  const [ravi, sneha, mohan, anita] = await Promise.all([
    prisma.lead.create({
      data: {
        name: "Ravi Kumar",
        phone: "+91 98765 10001",
        email: "ravi.kumar@example.com",
        source: "Website",
        budgetMin: 4_000_000,
        budgetMax: 6_000_000,
        locationPreference: "Visakhapatnam",
        tags: ["Investor", "Repeat"],
        status: LeadStatus.WARM,
        score: 78,
        assignedToId: sales.id,
        consentGiven: true,
        consentTimestamp: new Date(now - day * 6),
      },
    }),
    prisma.lead.create({
      data: {
        name: "Sneha Rao",
        phone: "+91 98765 10002",
        email: "sneha.rao@example.com",
        source: "WhatsApp",
        budgetMin: 10_000_000,
        budgetMax: 14_000_000,
        locationPreference: "Madhurawada",
        tags: ["Premium"],
        status: LeadStatus.HOT,
        score: 88,
        assignedToId: sales.id,
        consentGiven: true,
        consentTimestamp: new Date(now - day * 3),
      },
    }),
    prisma.lead.create({
      data: {
        name: "Mohan Reddy",
        phone: "+91 98765 10003",
        source: "Referral",
        budgetMin: 2_500_000,
        budgetMax: 3_500_000,
        locationPreference: "Bheemili",
        tags: [],
        status: LeadStatus.COLD,
        score: 32,
        assignedToId: sales.id,
        consentGiven: true,
        consentTimestamp: new Date(now - day * 30),
      },
    }),
    prisma.lead.create({
      data: {
        name: "Anita Sharma",
        phone: "+91 98765 10004",
        email: "anita.s@example.com",
        source: "Ads",
        budgetMin: 7_500_000,
        budgetMax: 9_500_000,
        locationPreference: "Anandapuram",
        tags: ["First-time buyer"],
        status: LeadStatus.WARM,
        score: 65,
        assignedToId: manager.id,
        consentGiven: true,
        consentTimestamp: new Date(now - day * 2),
      },
    }),
  ]);

  console.log("  ✓ Leads (4)");

  const opp1 = await prisma.opportunity.create({
    data: {
      leadId: ravi.id,
      projectId: green.id,
      propertyId: propA1.id,
      stage: OpportunityStage.NEGOTIATION,
      probability: 70,
      assignedToId: sales.id,
    },
  });
  const opp2 = await prisma.opportunity.create({
    data: {
      leadId: sneha.id,
      projectId: skyline.id,
      propertyId: propT2.id,
      stage: OpportunityStage.SITE_VISIT_DONE,
      probability: 55,
      assignedToId: sales.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      leadId: sneha.id,
      projectId: green.id,
      stage: OpportunityStage.CONTACTED,
      probability: 30,
      assignedToId: sales.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      leadId: mohan.id,
      projectId: palm.id,
      stage: OpportunityStage.NEW,
      probability: 10,
      assignedToId: sales.id,
    },
  });
  await prisma.opportunity.create({
    data: {
      leadId: anita.id,
      projectId: green.id,
      stage: OpportunityStage.SITE_VISIT_SCHEDULED,
      probability: 45,
      assignedToId: manager.id,
    },
  });

  // Stage history for opp1 (full progression)
  const progression: Array<{
    oldStage: OpportunityStage | null;
    newStage: OpportunityStage;
    daysAgo: number;
  }> = [
    { oldStage: null, newStage: OpportunityStage.NEW, daysAgo: 10 },
    {
      oldStage: OpportunityStage.NEW,
      newStage: OpportunityStage.CONTACTED,
      daysAgo: 8,
    },
    {
      oldStage: OpportunityStage.CONTACTED,
      newStage: OpportunityStage.SITE_VISIT_SCHEDULED,
      daysAgo: 5,
    },
    {
      oldStage: OpportunityStage.SITE_VISIT_SCHEDULED,
      newStage: OpportunityStage.SITE_VISIT_DONE,
      daysAgo: 3,
    },
    {
      oldStage: OpportunityStage.SITE_VISIT_DONE,
      newStage: OpportunityStage.NEGOTIATION,
      daysAgo: 0.75,
    },
  ];
  for (const p of progression) {
    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: opp1.id,
        oldStage: p.oldStage,
        newStage: p.newStage,
        changedById: sales.id,
        changedAt: new Date(now - day * p.daysAgo),
      },
    });
  }
  await prisma.opportunityStageHistory.create({
    data: {
      opportunityId: opp2.id,
      oldStage: null,
      newStage: OpportunityStage.NEW,
      changedById: sales.id,
    },
  });

  console.log("  ✓ Opportunities (5) + stage history");

  // Activities
  await prisma.activity.createMany({
    data: [
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        type: ActivityType.CALL,
        title: "Discovery call",
        description:
          "30-min intro call — walked through Green Valley layout, lead asked about DTCP approval and loan tie-ups.",
        durationMinutes: 30,
        outcome: "Interested, wants site visit",
        createdById: sales.id,
        createdAt: new Date(now - day * 8),
      },
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        type: ActivityType.NOTE,
        title: "Pre-visit prep",
        description:
          "Lead is comparing with Skyline Heights. Lead with villa plot value + infra progress vs. high-rise maintenance costs.",
        createdById: sales.id,
        createdAt: new Date(now - day * 6),
      },
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        type: ActivityType.MEETING,
        title: "Site visit — Green Valley",
        description: "Walked plots A-01 and A-02. Lead liked A-01 (east facing).",
        durationMinutes: 90,
        outcome: "Positive — wants negotiation on A-01",
        createdById: sales.id,
        createdAt: new Date(now - day * 3),
      },
      {
        leadId: sneha.id,
        opportunityId: opp2.id,
        type: ActivityType.CALL,
        title: "Follow-up call",
        description: "Clarified club-house amenities and possession timeline.",
        durationMinutes: 15,
        outcome: "Scheduling site visit for next weekend",
        createdById: sales.id,
        createdAt: new Date(now - day * 1),
      },
    ],
  });

  // Messages
  await prisma.message.createMany({
    data: [
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.OUTBOUND,
        messageText:
          "Hi Ravi, sending across the Green Valley brochure + plot map. Let me know a time to walk through these.",
        status: MessageStatus.READ,
        sentById: sales.id,
        createdAt: new Date(now - day * 9),
      },
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.INBOUND,
        messageText: "Thanks, will go through. Is the price negotiable?",
        status: MessageStatus.READ,
        createdAt: new Date(now - day * 8 - 1000 * 60 * 30),
      },
      {
        leadId: ravi.id,
        opportunityId: opp1.id,
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.OUTBOUND,
        messageText:
          "Happy to discuss — block 10 mins tomorrow? Will walk you through the best options.",
        status: MessageStatus.READ,
        sentById: sales.id,
        createdAt: new Date(now - day * 8),
      },
      {
        leadId: sneha.id,
        opportunityId: opp2.id,
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.INBOUND,
        messageText: "Will visit this Saturday for the 4BHK. Please share address.",
        status: MessageStatus.READ,
        createdAt: new Date(now - 1000 * 60 * 60 * 4),
      },
      {
        leadId: sneha.id,
        opportunityId: opp2.id,
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.OUTBOUND,
        messageText:
          "Perfect. Address + Google Maps pin shared. Meet our sales lead Priya at the site office.",
        status: MessageStatus.DELIVERED,
        sentById: sales.id,
        createdAt: new Date(now - 1000 * 60 * 60 * 2),
      },
    ],
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        title: "Call Ravi Kumar — negotiation follow-up",
        description: "Close on price or walk away by Thursday.",
        dueDate: new Date(now + day * 1),
        status: TaskStatus.PENDING,
        assignedToId: sales.id,
        leadId: ravi.id,
        opportunityId: opp1.id,
      },
      {
        title: "Share master layout with Sneha Rao",
        dueDate: new Date(now - day * 1),
        status: TaskStatus.PENDING,
        assignedToId: sales.id,
        leadId: sneha.id,
        opportunityId: opp2.id,
      },
      {
        title: "Prepare brochure — Palm Grove launch",
        description: "Dhanya to design, review by Monday.",
        dueDate: new Date(now + day * 4),
        status: TaskStatus.PENDING,
        assignedToId: manager.id,
      },
      {
        title: "Update Anita Sharma with new price card",
        dueDate: new Date(now - day * 3),
        status: TaskStatus.COMPLETED,
        assignedToId: sales.id,
        leadId: anita.id,
      },
    ],
  });

  console.log("  ✓ Activities, messages, tasks");

  // Pipeline stages reference data
  const stages = [
    { name: "New", isClosed: false },
    { name: "Contacted", isClosed: false },
    { name: "Site Visit Scheduled", isClosed: false },
    { name: "Site Visit Done", isClosed: false },
    { name: "Negotiation", isClosed: false },
    { name: "Closed Won", isClosed: true },
    { name: "Closed Lost", isClosed: true },
  ];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]!;
    await prisma.pipelineStage.create({
      data: {
        name: s.name,
        orderIndex: i,
        isDefault: true,
        isClosed: s.isClosed,
      },
    });
  }

  // Integrations placeholders
  await prisma.integration.createMany({
    data: [
      { type: "whatsapp", status: "not_configured", config: {} },
      { type: "email", status: "not_configured", config: {} },
      { type: "sms", status: "not_configured", config: {} },
    ],
  });

  console.log("  ✓ Pipeline stages + integrations");

  // Phase 2 — marketing campaigns
  const camp1 = await prisma.campaign.create({
    data: {
      name: "Green Valley — Weekend Open House",
      description: "Promote Saturday site visit for Green Valley plots.",
      projectId: green.id,
      type: CampaignType.WHATSAPP_BLAST,
      status: CampaignStatus.DRAFT,
      audienceFilter: { status: LeadStatus.WARM, minScore: 50 },
      createdById: admin.id,
      createdAt: new Date(now - day * 2),
    },
  });
  await prisma.campaignMessage.create({
    data: {
      campaignId: camp1.id,
      channel: MessageChannel.WHATSAPP,
      content:
        "Hi {{name}}, our Green Valley site visit is this Saturday 11am. Plots A-01 and A-02 are still open. Want me to reserve a slot?",
      status: CampaignMessageStatus.DRAFT,
    },
  });
  await prisma.campaignAudience.createMany({
    data: [
      {
        campaignId: camp1.id,
        leadId: ravi.id,
        status: CampaignAudienceStatus.PENDING,
      },
      {
        campaignId: camp1.id,
        leadId: anita.id,
        status: CampaignAudienceStatus.PENDING,
      },
    ],
  });

  const camp2 = await prisma.campaign.create({
    data: {
      name: "Skyline Heights — Pre-launch Nurture",
      description: "Educate premium leads ahead of Tower 3 launch.",
      projectId: skyline.id,
      type: CampaignType.EMAIL_BLAST,
      status: CampaignStatus.COMPLETED,
      createdById: admin.id,
      createdAt: new Date(now - day * 10),
    },
  });
  await prisma.campaignMessage.create({
    data: {
      campaignId: camp2.id,
      channel: MessageChannel.EMAIL,
      content:
        "Subject: Skyline Heights Tower 3 — priority access\n\nHi,\n\nWe're opening Tower 3 bookings next month. As a premium prospect you get first pick of east-facing units. Reply for the price sheet.",
      status: CampaignMessageStatus.SENT,
    },
  });
  await prisma.campaignAudience.create({
    data: {
      campaignId: camp2.id,
      leadId: sneha.id,
      status: CampaignAudienceStatus.SENT,
      sentAt: new Date(now - day * 6),
    },
  });

  console.log("  ✓ Marketing campaigns (2)");

  console.log(`\n✅ Seed complete. Demo logins (password: "${PASSWORD}"):`);
  console.log("   admin@demo.com · manager@demo.com · sales@demo.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
