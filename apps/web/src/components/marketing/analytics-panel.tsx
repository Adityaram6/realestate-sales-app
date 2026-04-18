"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Mail, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { campaignsApi } from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  campaignId: string;
}

export function AnalyticsPanel({ campaignId }: AnalyticsPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaign", campaignId, "analytics"],
    queryFn: () => campaignsApi.analytics(campaignId),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState title="Couldn't load analytics" />;
  }

  const funnel = data.deliveryFunnel;
  const max = Math.max(
    funnel.pending,
    funnel.sent,
    funnel.delivered,
    funnel.responded,
    funnel.failed,
    1,
  );
  const steps: Array<{ label: string; value: number; accent: string }> = [
    { label: "Pending", value: funnel.pending, accent: "bg-slate-400" },
    { label: "Sent", value: funnel.sent, accent: "bg-blue-500" },
    { label: "Delivered", value: funnel.delivered, accent: "bg-sky-500" },
    { label: "Responded", value: funnel.responded, accent: "bg-emerald-500" },
    { label: "Failed", value: funnel.failed, accent: "bg-red-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <ConversionStat
          label="Delivery rate"
          value={data.conversion.deliveredPercent}
          variant="default"
        />
        <ConversionStat
          label="Response rate"
          value={data.conversion.responseRatePercent}
          variant="success"
        />
        <ConversionStat
          label="Failure rate"
          value={data.conversion.failureRatePercent}
          variant="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{s.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.value}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full transition-all", s.accent)}
                  style={{ width: `${(s.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message variations</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topVariations.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No messages sent yet"
              description="Add messages and execute the campaign to see per-variation stats."
            />
          ) : (
            <ul className="space-y-2">
              {data.topVariations.map((v) => (
                <li
                  key={v.messageId}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                    {v.channel === "EMAIL" ? (
                      <Mail className="h-3.5 w-3.5" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {v.channel.toLowerCase()}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">
                      {v.contentPreview}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {v.sent}
                    </div>
                    <div className="text-[11px] text-muted-foreground">sent</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConversionStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "default" | "success" | "destructive";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums",
            variant === "success" && "text-emerald-600",
            variant === "destructive" && "text-destructive",
          )}
        >
          {value}%
        </div>
      </CardContent>
    </Card>
  );
}
