import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: Array<Record<string, string>>;
}

/**
 * Parse a user-uploaded spreadsheet (CSV / XLS / XLSX) into a normalized
 * headers + rows shape. Kept small on purpose — anything fancy (type
 * inference, multi-sheet selection) belongs here so the UI stays simple.
 */
export async function parseBulkFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return parseCsv(file);
  }
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
    return parseXlsx(file);
  }
  throw new Error(
    "Unsupported file type. Upload a .csv, .xls, or .xlsx file.",
  );
}

function parseCsv(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(Boolean);
        const rows = result.data
          .map((r) => normalizeRow(r, headers))
          .filter(rowHasContent);
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("No sheet found in workbook");
  }
  const sheet = wb.Sheets[firstSheetName];
  if (!sheet) throw new Error("Sheet data missing");
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (json.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(json[0] ?? {}).map((h) => h.trim());
  const rows = json
    .map((r) => normalizeRow(r, headers))
    .filter(rowHasContent);
  return { headers, rows };
}

function normalizeRow(
  raw: Record<string, unknown>,
  headers: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const v = raw[h];
    out[h] = v == null ? "" : String(v).trim();
  }
  return out;
}

function rowHasContent(row: Record<string, string>): boolean {
  return Object.values(row).some((v) => v !== "");
}

/** System fields a file column can map to. */
export type SystemFieldKey =
  | "name"
  | "phone"
  | "email"
  | "source"
  | "budgetMin"
  | "budgetMax"
  | "locationPreference"
  | "tags";

interface SystemFieldDef {
  key: SystemFieldKey;
  label: string;
  required?: boolean;
}

export const SYSTEM_FIELDS: readonly SystemFieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email" },
  { key: "source", label: "Source" },
  { key: "budgetMin", label: "Budget min" },
  { key: "budgetMax", label: "Budget max" },
  { key: "locationPreference", label: "Location preference" },
  { key: "tags", label: "Tags (comma-separated)" },
];

export const SYSTEM_FIELD_KEYS: SystemFieldKey[] = SYSTEM_FIELDS.map(
  (f) => f.key,
);

/**
 * Best-effort auto-mapping from file headers to system fields. Uses
 * lowercased/space-stripped string contains to catch common variants
 * (e.g. "Phone Number" → phone, "Min Budget" → budgetMin).
 */
export function autoMapHeaders(
  headers: string[],
): Record<string, SystemFieldKey | "__custom__" | "__skip__"> {
  const map: Record<string, SystemFieldKey | "__custom__" | "__skip__"> = {};
  for (const h of headers) {
    const key = normalize(h);
    map[h] =
      matchField(key) ??
      (key.includes("note") || key.includes("comment")
        ? "__custom__"
        : "__skip__");
  }
  return map;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchField(key: string): SystemFieldKey | undefined {
  if (key === "name" || key.includes("fullname") || key === "leadname")
    return "name";
  if (
    key === "phone" ||
    key === "mobile" ||
    key.includes("phonenumber") ||
    key.includes("mobilenumber")
  )
    return "phone";
  if (key === "email" || key.includes("emailid") || key.includes("mailid"))
    return "email";
  if (key.includes("source") || key === "channel") return "source";
  if (key.includes("minbudget") || key === "budgetmin") return "budgetMin";
  if (key.includes("maxbudget") || key === "budgetmax") return "budgetMax";
  if (key.includes("budget")) return "budgetMin";
  if (key.includes("location") || key.includes("city") || key.includes("area"))
    return "locationPreference";
  if (key.includes("tag")) return "tags";
  return undefined;
}

export function coerceNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/[^\d.]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

export function coerceTags(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  return v
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
