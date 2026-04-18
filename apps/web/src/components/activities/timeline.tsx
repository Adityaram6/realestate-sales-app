"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  MessageSquare,
  Mail,
  Users,
  FileText,
  ArrowRightLeft,
  Plus,
  Filter,
  Activity as ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { AddActivityDialog } from "@/components/activities/add-activity-dialog";
import { activitiesApi, type TimelineItem } from "@/lib/activities-api";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimelineProps {
  leadId: string;
  defaultOpportunityId?: string;
}

type FilterKind = "all" | TimelineItem["kind"];

const ICON: Record<string, typeof Phone> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: Users,
  note: FileText,
  system: ActivityIcon,
  inbound_message: MessageSquare,
  outbound_message: MessageSquare,
  stage_change: ArrowRightLeft,
};

const ACCENT: Record<string, string> = {
  call: "bg-blue-100 text-blue-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  email: "bg-indigo-100 text-indigo-700",
  meeting: "bg-amber-100 text-amber-700",
  note: "bg-slate-100 text-slate-700",
  inbound_message: "bg-emerald-50 text-emerald-700",
  outbound_message: "bg-blue-50 text-blue-700",
  stage_change: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
};

export function Timeline({ leadId, defaultOpportunityId }: TimelineProps) {
  const [filter, setFilter] = useState<FilterKind>("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", leadId],
    queryFn: () => activitiesApi.timeline(leadId),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((i) => i.kind === filter);
  }, [data, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as FilterKind)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="activity">Activities</SelectItem>
              <SelectItem value="message">Messages</SelectItem>
              <SelectItem value="stage_change">Stage changes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Log activity
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No events yet"
          description={
            filter === "all"
              ? "Log a call, meeting, or note to start the timeline."
              : "No events match this filter."
          }
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Log activity
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-4 border-l pl-6">
          {filtered.map((item) => {
            const Icon = ICON[item.type] ?? ActivityIcon;
            const accent = ACCENT[item.type] ?? ACCENT.system;
            return (
              <li key={item.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[30px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                    accent,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.projectName ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.projectName}
                        </Badge>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="shrink-0 text-xs text-muted-foreground"
                    title={formatDateTime(item.createdAt)}
                  >
                    {formatRelativeTime(item.createdAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <AddActivityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        leadId={leadId}
        opportunityId={defaultOpportunityId}
      />
    </div>
  );
}
