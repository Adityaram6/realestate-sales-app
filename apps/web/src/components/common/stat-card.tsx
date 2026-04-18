import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
            )}
            {delta ? (
              <p
                className={cn(
                  "text-xs",
                  delta.trend === "up" && "text-emerald-600",
                  delta.trend === "down" && "text-destructive",
                  delta.trend === "flat" && "text-muted-foreground",
                )}
              >
                {delta.value}
              </p>
            ) : null}
          </div>
          {Icon ? (
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
