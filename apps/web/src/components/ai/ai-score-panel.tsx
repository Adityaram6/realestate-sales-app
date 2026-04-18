"use client";

import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { aiApi } from "@/lib/ai-api";
import { cn } from "@/lib/utils";

interface AiScorePanelProps {
  leadId: string;
}

export function AiScorePanel({ leadId }: AiScorePanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai", "score", leadId],
    queryFn: () => aiApi.score({ leadId }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" />
          Lead score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground">
            Couldn't compute a score.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <div
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  data.score >= 75
                    ? "text-red-600"
                    : data.score >= 40
                      ? "text-amber-600"
                      : "text-slate-500",
                )}
              >
                {data.score}
              </div>
              <LeadStatusBadge status={data.label} />
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  data.score >= 75
                    ? "bg-red-500"
                    : data.score >= 40
                      ? "bg-amber-500"
                      : "bg-slate-400",
                )}
                style={{ width: `${data.score}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">{data.reasoning}</p>

            {data.factors.length > 0 ? (
              <ul className="space-y-1.5">
                {data.factors.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-muted-foreground">{f.value}</div>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono font-semibold tabular-nums",
                        f.weight > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {f.weight > 0 ? "+" : ""}
                      {f.weight}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
