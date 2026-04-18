"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlowTriggerBadge } from "@/components/flows/flow-status-badge";
import { flowsApi } from "@/lib/flows-api";
import { formatRelativeTime } from "@/lib/utils";
import type { CampaignFlowWithRelations } from "@realestate/shared";

export default function FlowsListPage() {
  const router = useRouter();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["flows", "list"],
    queryFn: () => flowsApi.list(),
  });

  const columns: DataTableColumn<CampaignFlowWithRelations>[] = [
    {
      key: "name",
      header: "Flow",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description ? (
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {row.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      cell: (row) => <FlowTriggerBadge trigger={row.trigger} />,
    },
    {
      key: "steps",
      header: "Steps",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.steps.length} step{row.steps.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "executions",
      header: "Executions",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.activeExecutions} running · {row.completedExecutions} done
        </span>
      ),
    },
    {
      key: "active",
      header: "State",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(row.updatedAt)}
        </span>
      ),
      headerClassName: "text-right",
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flows"
        description="Automations that fire on triggers like Lead added or Stage changed — with waits, messages, and tasks."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/marketing">Campaigns</Link>
            </Button>
            <Button asChild>
              <Link href="/marketing/flows/new">
                <Plus className="h-4 w-4" />
                New flow
              </Link>
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        onRowClick={(row) => router.push(`/marketing/flows/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Workflow}
            title="No flows yet"
            description="Flows auto-trigger when events happen — e.g. a WhatsApp intro when a new lead is added."
            action={
              <Button asChild size="sm">
                <Link href="/marketing/flows/new">
                  <Plus className="h-4 w-4" /> New flow
                </Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
