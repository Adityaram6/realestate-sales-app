import {
  ProjectStatus,
  PropertyStatus,
  type Project,
  type ProjectDocument,
  type Property,
} from "@realestate/shared";

/**
 * In-memory fixture store used by mock handlers. Mutations persist in this
 * process so the UI feels real. Swap for a real API by flipping
 * NEXT_PUBLIC_USE_MOCK=false.
 */
export const projectStore: Project[] = [
  {
    id: "prj-1",
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
    createdBy: "u-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prj-2",
    projectCode: "PRJ-2026-0002",
    name: "Skyline Heights",
    description: "3 & 4 BHK apartments in the heart of Madhurawada.",
    locationText: "Madhurawada, Visakhapatnam",
    latitude: 17.8174,
    longitude: 83.3697,
    propertyType: "Apartments",
    tags: ["RERA Approved", "Ready to Move"],
    status: ProjectStatus.ACTIVE,
    createdBy: "u-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prj-3",
    projectCode: "PRJ-2026-0003",
    name: "Palm Grove",
    description: "Farm plots with managed coconut and mango orchards.",
    locationText: "Bheemili, Visakhapatnam",
    propertyType: "Farm Land",
    tags: ["Farm Land"],
    status: ProjectStatus.DRAFT,
    createdBy: "u-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const propertyStore: Property[] = [
  {
    id: "prop-1",
    projectId: "prj-1",
    unitNumber: "A-01",
    size: 240,
    sizeUnit: "sqyd",
    price: 4_800_000,
    facing: "East",
    status: PropertyStatus.AVAILABLE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prop-2",
    projectId: "prj-1",
    unitNumber: "A-02",
    size: 300,
    sizeUnit: "sqyd",
    price: 6_000_000,
    facing: "North",
    status: PropertyStatus.RESERVED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prop-3",
    projectId: "prj-1",
    unitNumber: "B-05",
    size: 267,
    sizeUnit: "sqyd",
    price: 5_200_000,
    facing: "West",
    status: PropertyStatus.SOLD,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prop-4",
    projectId: "prj-2",
    unitNumber: "T2-1203",
    size: 1485,
    sizeUnit: "sqft",
    price: 11_500_000,
    facing: "East",
    status: PropertyStatus.AVAILABLE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const documentStore: ProjectDocument[] = [
  {
    id: "doc-1",
    projectId: "prj-1",
    fileName: "Green Valley — Brochure.pdf",
    fileUrl: "https://example.com/mock/brochure.pdf",
    fileType: "brochure",
    fileSize: 2_450_000,
    mimeType: "application/pdf",
    version: 1,
    uploadedBy: "u-1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "doc-2",
    projectId: "prj-1",
    fileName: "Master Layout.jpg",
    fileUrl: "https://example.com/mock/layout.jpg",
    fileType: "layout",
    fileSize: 1_200_000,
    mimeType: "image/jpeg",
    version: 2,
    uploadedBy: "u-1",
    createdAt: new Date().toISOString(),
  },
];

export function nextProjectCode(): string {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const existing = projectStore
    .map((p) => p.projectCode)
    .filter((c) => c.startsWith(prefix));
  let max = existing.length;
  for (const c of existing) {
    const n = parseInt(c.replace(prefix, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
