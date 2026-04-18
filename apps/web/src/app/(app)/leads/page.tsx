"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, Upload, Users, Search } from "lucide-react";
import { leadsApi } from "@/lib/leads-api";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import {
  LeadScoreDot,
  LeadStatusBadge,
} from "@/components/leads/lead-status-badge";
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
  LeadStatus,
  type Lead,
  type LeadListFilters,
} from "@realestate/shared";
import { formatCurrencyINR, formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function LeadsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [location, setLocation] = useState("");
  const [budgetBand, setBudgetBand] = useState<string>("all");
  const [page, setPage] = useState(1);

  const budgetFilter: Pick<LeadListFilters, "budgetMin" | "budgetMax"> = (() => {
    switch (budgetBand) {
      case "<50L":
        return { budgetMax: 5_000_000 };
      case "50L-1Cr":
        return { budgetMin: 5_000_000, budgetMax: 10_000_000 };
      case "1Cr+":
        return { budgetMin: 10_000_000 };
      default:
        return {};
    }
  })();

  const filters: LeadListFilters = {
    search: search || undefined,
    status: status === "all" ? undefined : status,
    location: location || undefined,
    ...budgetFilter,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", "list", filters],
    queryFn: () => leadsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.phone}</div>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      cell: (row) =>
        row.budgetMin || row.budgetMax ? (
          <span className="text-sm">
            {formatCurrencyINR(row.budgetMin)} – {formatCurrencyINR(row.budgetMax)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.locationPreference ?? "—"}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.source ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <LeadStatusBadge status={row.status} />,
    },
    {
      key: "score",
      header: "Score",
      cell: (row) => <LeadScoreDot score={row.score} />,
    },
    {
      key: "updated",
      header: "Activity",
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
        title="Leads"
        description="All prospects — filter, search, or attach them to a project."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/leads/bulk-upload">
                <Upload className="h-4 w-4" />
                Bulk upload
              </Link>
            </Button>
            <Button asChild>
              <Link href="/leads/new">
                <Plus className="h-4 w-4" />
                New lead
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone, or email"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as LeadStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={LeadStatus.HOT}>Hot</SelectItem>
            <SelectItem value={LeadStatus.WARM}>Warm</SelectItem>
            <SelectItem value={LeadStatus.COLD}>Cold</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={budgetBand}
          onValueChange={(v) => {
            setBudgetBand(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any budget</SelectItem>
            <SelectItem value="<50L">Under ₹50L</SelectItem>
            <SelectItem value="50L-1Cr">₹50L – ₹1 Cr</SelectItem>
            <SelectItem value="1Cr+">Above ₹1 Cr</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
          placeholder="Location"
          className="max-w-[180px]"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        onRowClick={(row) => router.push(`/leads/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title="No leads match your filters"
            description="Try clearing filters, adding a lead, or bulk-importing from a CSV."
            action={
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/leads/bulk-upload">
                    <Upload className="h-4 w-4" /> Bulk upload
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/leads/new">
                    <Plus className="h-4 w-4" /> New lead
                  </Link>
                </Button>
              </div>
            }
          />
        }
        pagination={
          data
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
