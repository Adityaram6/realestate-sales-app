"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Megaphone, Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CampaignStatusBadge,
  CampaignTypeBadge,
} from "@/components/marketing/campaign-status-badge";
import { campaignsApi } from "@/lib/campaigns-api";
import {
  CampaignStatus,
  CampaignType,
  type CampaignWithRelations,
} from "@realestate/shared";
import { formatRelativeTime } from "@/lib/utils";

export default function MarketingListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [type, setType] = useState<CampaignType | "all">("all");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["campaigns", "list", { search, status, type }],
    queryFn: () =>
      campaignsApi.list({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
      }),
  });

  const columns: DataTableColumn<CampaignWithRelations>[] = [
    {
      key: "name",
      header: "Campaign",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.projectName ? (
            <div className="text-xs text-muted-foreground">
              {row.projectName}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => <CampaignTypeBadge type={row.type} />,
    },
    {
      key: "audience",
      header: "Audience",
      cell: (row) => (
        <span className="text-sm">
          {row.audienceSize} lead{row.audienceSize === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.metrics.sent} sent · {row.metrics.responded} replied ·{" "}
          {row.metrics.pending} pending
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <CampaignStatusBadge status={row.status} />,
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
        title="Marketing"
        description="Campaigns, audiences, and AI-generated content — send WhatsApp blasts, emails, and social drafts."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/marketing/flows">Flows</Link>
            </Button>
            <Button asChild>
              <Link href="/marketing/new">
                <Plus className="h-4 w-4" />
                New campaign
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description"
            className="pl-9"
          />
        </div>
        <Select
          value={type}
          onValueChange={(v) => setType(v as CampaignType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={CampaignType.WHATSAPP_BLAST}>
              WhatsApp blast
            </SelectItem>
            <SelectItem value={CampaignType.EMAIL_BLAST}>Email blast</SelectItem>
            <SelectItem value={CampaignType.SOCIAL}>Social post</SelectItem>
            <SelectItem value={CampaignType.MULTI_CHANNEL}>
              Multi-channel
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as CampaignStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={CampaignStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={CampaignStatus.SCHEDULED}>Scheduled</SelectItem>
            <SelectItem value={CampaignStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={CampaignStatus.COMPLETED}>Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        onRowClick={(row) => router.push(`/marketing/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Launch your first WhatsApp blast or email campaign."
            action={
              <Button asChild size="sm">
                <Link href="/marketing/new">
                  <Plus className="h-4 w-4" />
                  New campaign
                </Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
