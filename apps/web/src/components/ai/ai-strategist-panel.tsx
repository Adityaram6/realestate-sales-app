"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Clock,
  AlertTriangle,
  Percent,
  PhoneCall,
  MessageSquare,
  BadgePercent,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { aiApi } from "@/lib/ai-api";
import type { StrategyOutput } from "@/lib/ai-mock";
import { cn } from "@/lib/utils";

interface AiStrategistPanelProps {
  leadId: string;
  opportunityId?: string;
}

const RISK_VARIANT: Record<
  StrategyOutput["riskLevel"],
  "muted" | "warning" | "destructive"
> = {
  low: "muted",
  medium: "warning",
  high: "destructive",
};

const APPROACH_ICON: Record<
  StrategyOutput["approach"],
  typeof PhoneCall
> = {
  call: PhoneCall,
  message: MessageSquare,
  offer: BadgePercent,
  site_visit: MapPin,
};

const TIMING_LABEL: Record<StrategyOutput["timing"], string> = {
  now: "Now",
  "24h": "Within 24h",
  weekend: "This weekend",
  next_week: "Next week",
};

export function AiStrategistPanel({
  leadId,
  opportunityId,
}: AiStrategistPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai", "strategy", leadId, opportunityId ?? null],
    queryFn: () => aiApi.strategy({ leadId, opportunityId }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI strategist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground">
            Couldn't compute a strategy.
          </p>
        ) : (
          <>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Next best action
              </div>
              <p className="mt-1 text-sm font-medium">{data.nextAction}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatRow
                icon={Clock}
                label="Timing"
                value={TIMING_LABEL[data.timing]}
              />
              <StatRow
                icon={AlertTriangle}
                label="Risk"
                value={
                  <Badge variant={RISK_VARIANT[data.riskLevel]}>
                    {data.riskLevel}
                  </Badge>
                }
              />
              <StatRow
                icon={Percent}
                label="Conversion"
                value={
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      data.conversionProbability >= 70
                        ? "text-emerald-600"
                        : data.conversionProbability >= 40
                          ? "text-amber-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {data.conversionProbability}%
                  </span>
                }
              />
              <StatRow
                icon={APPROACH_ICON[data.approach]}
                label="Approach"
                value={data.approach.replace(/_/g, " ")}
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reasoning
              </div>
              <p className="mt-1 text-sm leading-relaxed">{data.reasoning}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
