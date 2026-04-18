"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Building2,
  Target,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardApi } from "@/lib/dashboard-api";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: () => dashboardApi.metrics(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your pipeline at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={data?.totalLeads ?? "—"}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          label="Active Opportunities"
          value={data?.activeOpportunities ?? "—"}
          icon={Target}
          loading={isLoading}
        />
        <StatCard
          label="Conversion Rate"
          value={data ? `${data.conversionRate}%` : "—"}
          icon={TrendingUp}
          loading={isLoading}
        />
        <StatCard
          label="Projects Tracked"
          value={data?.leadsPerProject.length ?? "—"}
          icon={Building2}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Leads per project</CardTitle>
          </CardHeader>
          <CardContent>
            {isError ? (
              <EmptyState
                title="Couldn't load metrics"
                description="Try refreshing the page."
                action={
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                }
              />
            ) : isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            ) : data && data.leadsPerProject.length > 0 ? (
              <div className="space-y-3">
                {data.leadsPerProject.map((row) => {
                  const max = Math.max(
                    ...data.leadsPerProject.map((r) => r.count),
                  );
                  const pct = (row.count / max) * 100;
                  return (
                    <div key={row.projectName}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{row.projectName}</span>
                        <span className="text-muted-foreground">
                          {row.count}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No projects yet"
                description="Create your first project to start tracking leads."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            ) : data && data.recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="leading-snug">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Activity} title="No recent activity" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
