import { Badge } from "@/components/ui/badge";
import { LeadStatus } from "@realestate/shared";

const LABEL: Record<LeadStatus, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

const VARIANT: Record<
  LeadStatus,
  "destructive" | "warning" | "muted"
> = {
  hot: "destructive",
  warm: "warning",
  cold: "muted",
};

export function LeadStatusBadge({ status }: { status?: LeadStatus }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Unscored
      </Badge>
    );
  }
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

export function LeadScoreDot({ score }: { score?: number }) {
  if (score == null) return null;
  const tier: "hot" | "warm" | "cold" =
    score >= 75 ? "hot" : score >= 40 ? "warm" : "cold";
  const color: Record<typeof tier, string> = {
    hot: "bg-red-500",
    warm: "bg-amber-500",
    cold: "bg-slate-400",
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${color[tier]}`}
      />
      <span className="tabular-nums text-sm">{score}</span>
    </div>
  );
}
