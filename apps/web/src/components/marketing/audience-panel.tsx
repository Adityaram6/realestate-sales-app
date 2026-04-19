"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/hooks/use-toast";
import { campaignsApi } from "@/lib/campaigns-api";
import { leadsApi } from "@/lib/leads-api";
import { extractApiError } from "@/lib/api-client";
import {
  CampaignAudienceStatus,
  LeadStatus,
  type AudienceFilter,
} from "@realestate/shared";
import { cn } from "@/lib/utils";

const AUDIENCE_STATUS_VARIANT: Record<
  CampaignAudienceStatus,
  "muted" | "default" | "success" | "destructive" | "warning" | "secondary"
> = {
  PENDING: "muted",
  SENT: "default",
  DELIVERED: "default",
  RESPONDED: "success",
  FAILED: "destructive",
  UNSUBSCRIBED: "warning",
};

interface AudiencePanelProps {
  campaignId: string;
  locked: boolean;
}

export function AudiencePanel({ campaignId, locked }: AudiencePanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["campaign", campaignId, "audience"],
    queryFn: () => campaignsApi.listAudience(campaignId),
  });

  const removeMut = useMutation({
    mutationFn: (leadId: string) =>
      campaignsApi.removeAudienceMember(campaignId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "audience"],
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Audience</h2>
          <p className="text-sm text-muted-foreground">
            Who receives this campaign. Add leads manually or apply a filter.
          </p>
        </div>
        {!locked ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add leads
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No audience yet"
          description="Add leads to start building the campaign's reach."
          action={
            !locked ? (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add leads
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.leadName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.leadPhone}
                  </TableCell>
                  <TableCell>
                    <Badge variant={AUDIENCE_STATUS_VARIANT[m.status]}>
                      {m.status}
                    </Badge>
                    {m.errorMessage ? (
                      <div className="mt-0.5 text-[11px] text-destructive">
                        {m.errorMessage}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {!locked ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(`Remove ${m.leadName} from this campaign?`)
                          ) {
                            removeMut.mutate(m.leadId, {
                              onError: (err) => {
                                toast.show({
                                  title: "Remove failed",
                                  description: extractApiError(err).message,
                                  variant: "destructive",
                                });
                              },
                            });
                          }
                        }}
                        aria-label={`Remove ${m.leadName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddAudienceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        campaignId={campaignId}
      />
    </div>
  );
}

function AddAudienceDialog({
  open,
  onOpenChange,
  campaignId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"filter" | "manual">("filter");
  const [filter, setFilter] = useState<AudienceFilter>({});
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const { data: leads } = useQuery({
    queryKey: ["leads", "for-audience-picker"],
    queryFn: () => leadsApi.list({ pageSize: 200 }),
    enabled: open && mode === "manual",
  });

  const assignMut = useMutation({
    mutationFn: () =>
      campaignsApi.assignAudience(campaignId, {
        leadIds: mode === "manual" ? Array.from(selectedLeads) : undefined,
        filter: mode === "filter" ? filter : undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "audience"],
      });
      toast.show({
        title: `${result.added} lead${result.added === 1 ? "" : "s"} added`,
        description:
          result.alreadyPresent > 0
            ? `${result.alreadyPresent} already in audience`
            : undefined,
        variant: "success",
      });
      setSelectedLeads(new Set());
      setFilter({});
      onOpenChange(false);
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't add leads",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add leads to audience</DialogTitle>
          <DialogDescription>
            Pick leads by filter or one-by-one. Duplicates are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-md bg-muted p-1">
          {(["filter", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "filter" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  By filter
                </span>
              ) : (
                "Pick manually"
              )}
            </button>
          ))}
        </div>

        {mode === "filter" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Lead status">
              <Select
                value={filter.status ?? "any"}
                onValueChange={(v) =>
                  setFilter((f) => ({
                    ...f,
                    status: v === "any" ? undefined : (v as LeadStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value={LeadStatus.HOT}>Hot</SelectItem>
                  <SelectItem value={LeadStatus.WARM}>Warm</SelectItem>
                  <SelectItem value={LeadStatus.COLD}>Cold</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Min score">
              <Input
                type="number"
                min={0}
                max={100}
                value={filter.minScore ?? ""}
                onChange={(e) =>
                  setFilter((f) => ({
                    ...f,
                    minScore: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
              />
            </FormField>
            <FormField label="Source">
              <Input
                value={filter.source ?? ""}
                onChange={(e) =>
                  setFilter((f) => ({
                    ...f,
                    source: e.target.value || undefined,
                  }))
                }
                placeholder="e.g. Website"
              />
            </FormField>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto rounded-md border">
            <ul className="divide-y">
              {leads?.data.map((l) => {
                const checked = selectedLeads.has(l.id);
                return (
                  <li key={l.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 p-3 transition-colors",
                        checked && "bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={checked}
                        onChange={() =>
                          setSelectedLeads((prev) => {
                            const next = new Set(prev);
                            if (next.has(l.id)) next.delete(l.id);
                            else next.add(l.id);
                            return next;
                          })
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.phone}
                          {l.status ? ` · ${l.status}` : ""}
                          {l.score != null ? ` · score ${l.score}` : ""}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMut.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => assignMut.mutate()}
            disabled={
              assignMut.isPending ||
              (mode === "manual" && selectedLeads.size === 0)
            }
          >
            {assignMut.isPending ? <Loader2 className="animate-spin" /> : null}
            Add{mode === "manual" && selectedLeads.size > 0
              ? ` ${selectedLeads.size}`
              : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
