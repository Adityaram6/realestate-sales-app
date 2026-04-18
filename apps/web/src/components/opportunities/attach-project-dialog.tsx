"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { projectsApi } from "@/lib/projects-api";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { extractApiError } from "@/lib/api-client";
import { ProjectStatus } from "@realestate/shared";
import { cn } from "@/lib/utils";

interface AttachProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  excludeProjectIds?: string[];
}

export function AttachProjectDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  excludeProjectIds = [],
}: AttachProjectDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", "attach-picker"],
    queryFn: () =>
      projectsApi.list({ status: ProjectStatus.ACTIVE, pageSize: 100 }),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();
    return (data?.data ?? []).filter((p) => {
      if (excludeProjectIds.includes(p.id)) return false;
      if (!lowered) return true;
      return (
        p.name.toLowerCase().includes(lowered) ||
        p.locationText.toLowerCase().includes(lowered) ||
        p.projectCode.toLowerCase().includes(lowered)
      );
    });
  }, [data, search, excludeProjectIds]);

  const attachMut = useMutation({
    mutationFn: () =>
      opportunitiesApi.attach({
        leadId,
        projectIds: Array.from(selected),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({
        queryKey: ["opportunities", "for-lead", leadId],
      });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });

      const createdCount = result.created.length;
      const skippedCount = result.skipped.length;
      toast.show({
        title: createdCount > 0 ? "Projects attached" : "Nothing to attach",
        description:
          createdCount > 0
            ? `${createdCount} new opportunit${
                createdCount === 1 ? "y" : "ies"
              } created${
                skippedCount > 0 ? ` · ${skippedCount} skipped (already linked)` : ""
              }`
            : "Selected projects were already linked.",
        variant: createdCount > 0 ? "success" : "default",
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.show({
        title: "Attach failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const toggle = (projectId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Attach projects to {leadName}</DialogTitle>
          <DialogDescription>
            Select one or more projects. A new opportunity is created for each
            — existing links are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or location"
            className="pl-9"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              No projects match your search.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 p-3 transition-colors",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-input"
                        checked={isSelected}
                        onChange={() => toggle(p.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {p.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p.projectCode}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.locationText} · {p.propertyType}
                        </div>
                        {p.tags.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.tags.slice(0, 3).map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center">
          <div className="mr-auto text-sm text-muted-foreground">
            {selected.size} selected
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={attachMut.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0 || attachMut.isPending}
            onClick={() => attachMut.mutate()}
          >
            {attachMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Attach {selected.size || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
