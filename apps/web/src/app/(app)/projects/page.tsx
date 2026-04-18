"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, Building2, Search } from "lucide-react";
import { projectsApi, type ProjectListFilters } from "@/lib/projects-api";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectStatus, type Project } from "@realestate/shared";
import { formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function ProjectsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: ProjectListFilters = {
    search: search || undefined,
    location: location || undefined,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["projects", "list", filters],
    queryFn: () => projectsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  const columns: DataTableColumn<Project>[] = [
    {
      key: "name",
      header: "Project",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.projectCode}</div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.locationText}</span>
      ),
    },
    {
      key: "propertyType",
      header: "Type",
      cell: (row) => <span className="text-sm">{row.propertyType}</span>,
    },
    {
      key: "tags",
      header: "Tags",
      cell: (row) =>
        row.tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {row.tags.length > 3 ? (
              <Badge variant="outline">+{row.tags.length - 3}</Badge>
            ) : null}
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ProjectStatusBadge status={row.status} />,
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
        title="Projects"
        description="Every property, plot, and document lives under a project."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
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
            placeholder="Search by name or project code"
            className="pl-9"
          />
        </div>
        <Input
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by location"
          className="max-w-[220px]"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ProjectStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={ProjectStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={ProjectStatus.INACTIVE}>Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        onRowClick={(row) => router.push(`/projects/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No projects match your filters"
            description="Try clearing filters or creating your first project."
            action={
              <Button asChild size="sm">
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" /> New project
                </Link>
              </Button>
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
