"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUploader, FileChip } from "@/components/common/file-uploader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  parseBulkFile,
  autoMapHeaders,
  coerceNumber,
  coerceTags,
  SYSTEM_FIELDS,
  SYSTEM_FIELD_KEYS,
  type ParsedSheet,
  type SystemFieldKey,
} from "@/lib/bulk-parse";
import { leadsApi, type BulkUploadRow, type BulkUploadResult } from "@/lib/leads-api";
import { extractApiError } from "@/lib/api-client";

type Step = 1 | 2 | 3 | 4;
type ColumnTarget = SystemFieldKey | "__custom__" | "__skip__";

export function BulkUploadWizard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, ColumnTarget>>({});
  const [defaultDupeAction, setDefaultDupeAction] =
    useState<BulkUploadRow["action"]>("skip");
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const parsed = await parseBulkFile(f);
      if (parsed.rows.length === 0) {
        toast.show({
          title: "No rows found",
          description: "The file parsed cleanly but had no data rows.",
          variant: "destructive",
        });
        setFile(null);
        return;
      }
      setSheet(parsed);
      setMapping(autoMapHeaders(parsed.headers));
      setStep(2);
    } catch (err) {
      toast.show({
        title: "Couldn't parse file",
        description: extractApiError(err).message,
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const { valid: mappingValid, errors: mappingErrors } = useMemo(() => {
    if (!sheet) return { valid: false, errors: [] as string[] };
    const mapped = new Set<SystemFieldKey>();
    for (const target of Object.values(mapping)) {
      if (target === "__custom__" || target === "__skip__") continue;
      mapped.add(target);
    }
    const errors: string[] = [];
    for (const f of SYSTEM_FIELDS) {
      if (f.required && !mapped.has(f.key)) {
        errors.push(`${f.label} must be mapped`);
      }
    }
    // Duplicate mappings
    const counts: Partial<Record<SystemFieldKey, number>> = {};
    for (const target of Object.values(mapping)) {
      if (target === "__custom__" || target === "__skip__") continue;
      counts[target] = (counts[target] ?? 0) + 1;
    }
    for (const [k, v] of Object.entries(counts)) {
      if ((v ?? 0) > 1) {
        const label = SYSTEM_FIELDS.find((f) => f.key === k)?.label ?? k;
        errors.push(`${label} is mapped to more than one column`);
      }
    }
    return { valid: errors.length === 0, errors };
  }, [mapping, sheet]);

  const rows = useMemo<BulkUploadRow[]>(() => {
    if (!sheet) return [];
    return sheet.rows.map((raw) => buildRow(raw, mapping, defaultDupeAction));
  }, [sheet, mapping, defaultDupeAction]);

  const uploadMut = useMutation({
    mutationFn: () => leadsApi.bulkUpload(rows),
    onSuccess: (res) => {
      setResult(res);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.show({
        title: "Import complete",
        description: `${res.created} created · ${res.merged} merged · ${res.skipped} skipped`,
        variant: "success",
      });
    },
    onError: (err) => {
      toast.show({
        title: "Import failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload your file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader
              accept=".csv,.xls,.xlsx"
              multiple={false}
              maxSizeMB={10}
              hint="CSV, XLS, or XLSX — up to 10MB, 10,000 rows"
              onFilesSelected={(files) => {
                const f = files[0];
                if (f) handleFile(f);
              }}
            />
            {parsing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file…
              </div>
            ) : null}
            {file && !parsing ? <FileChip file={file} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && sheet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preview{" "}
              <Badge variant="secondary" className="ml-2">
                {sheet.rows.length} rows
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">
              Verify the file parsed correctly. Showing the first 5 rows.
            </div>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheet.headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {sheet.headers.map((h) => (
                        <TableCell key={h} className="text-sm">
                          {row[h] || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setSheet(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different file
              </Button>
              <Button onClick={() => setStep(3)}>
                Map fields
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && sheet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map columns to fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Each file column maps to a system field, a custom field, or is
              skipped. Name and Phone are required.
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">File column</TableHead>
                    <TableHead className="w-[10%]">Sample</TableHead>
                    <TableHead>Maps to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.headers.map((h) => (
                    <TableRow key={h}>
                      <TableCell>
                        <div className="font-medium">{h}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sheet.rows[0]?.[h] || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[h] ?? "__skip__"}
                          onValueChange={(v) =>
                            setMapping((prev) => ({
                              ...prev,
                              [h]: v as ColumnTarget,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">— Skip —</SelectItem>
                            {SYSTEM_FIELD_KEYS.map((key) => {
                              const f = SYSTEM_FIELDS.find(
                                (sf) => sf.key === key,
                              )!;
                              return (
                                <SelectItem key={key} value={key}>
                                  {f.label}
                                  {f.required ? " *" : ""}
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="__custom__">
                              Custom field (keep column name)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {mappingErrors.length > 0 ? (
              <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {mappingErrors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            ) : null}

            <div className="rounded-md border bg-muted/30 p-4">
              <div className="text-sm font-medium">Duplicate handling</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Matches are checked on phone (primary) and email (secondary).
                Merge fills empty fields only; existing non-empty values are
                preserved.
              </p>
              <div className="mt-3">
                <Select
                  value={defaultDupeAction}
                  onValueChange={(v) =>
                    setDefaultDupeAction(v as BulkUploadRow["action"])
                  }
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="merge">
                      Merge into existing
                    </SelectItem>
                    <SelectItem value="create_new">
                      Create new anyway
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" />
                Back to preview
              </Button>
              <Button
                disabled={!mappingValid || uploadMut.isPending}
                onClick={() => uploadMut.mutate()}
              >
                {uploadMut.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import {sheet.rows.length} lead
                {sheet.rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && result ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Import finished</h2>
                <p className="text-sm text-muted-foreground">
                  {file?.name}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tally label="Created" value={result.created} />
              <Tally label="Merged" value={result.merged} />
              <Tally label="Skipped" value={result.skipped} />
            </div>
            {result.errors.length > 0 ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">
                  {result.errors.length} row
                  {result.errors.length === 1 ? "" : "s"} had errors
                </div>
                <ul className="mt-1 space-y-0.5 text-xs text-destructive/90">
                  {result.errors.slice(0, 10).map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 10 ? (
                    <li>… and {result.errors.length - 10} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setSheet(null);
                  setResult(null);
                }}
              >
                Import another file
              </Button>
              <Button asChild>
                <Link href="/leads">View leads</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Upload" },
    { n: 2, label: "Preview" },
    { n: 3, label: "Map fields" },
    { n: 4, label: "Done" },
  ] as const;
  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              s.n <= current
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {s.n}
          </span>
          <span
            className={cn(
              "font-medium",
              s.n === current
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span className="mx-1 h-px w-6 bg-border" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function buildRow(
  raw: Record<string, string>,
  mapping: Record<string, ColumnTarget>,
  action: BulkUploadRow["action"],
): BulkUploadRow {
  const row: BulkUploadRow = {
    name: "",
    phone: "",
    action,
  };
  const customFields: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    const target = mapping[header];
    if (!target || target === "__skip__") continue;
    if (target === "__custom__") {
      if (value) customFields[header] = value;
      continue;
    }
    switch (target) {
      case "name":
        row.name = value;
        break;
      case "phone":
        row.phone = value;
        break;
      case "email":
        row.email = value || undefined;
        break;
      case "source":
        row.source = value || undefined;
        break;
      case "budgetMin":
        row.budgetMin = coerceNumber(value);
        break;
      case "budgetMax":
        row.budgetMax = coerceNumber(value);
        break;
      case "locationPreference":
        row.locationPreference = value || undefined;
        break;
      case "tags":
        row.tags = coerceTags(value);
        break;
    }
  }
  if (Object.keys(customFields).length > 0) {
    row.customFields = customFields;
  }
  return row;
}
