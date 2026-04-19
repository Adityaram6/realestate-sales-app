"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { PropertiesPanel } from "@/components/projects/properties-panel";
import { DocumentsPanel } from "@/components/projects/documents-panel";
import { ProjectOpportunitiesPanel } from "@/components/opportunities/project-opportunities-panel";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/hooks/use-toast";
import { projectsApi } from "@/lib/projects-api";
import { extractApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { PropertyStatus } from "@realestate/shared";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const projectId = params.id;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
  });

  const deleteMut = useMutation({
    mutationFn: () => projectsApi.remove(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.show({
        title: "Project archived",
        description: "It has been marked inactive.",
        variant: "success",
      });
      router.push("/projects");
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
            All projects
          </Link>
        </Button>
        <EmptyState
          title="Project not found"
          description="It may have been deleted or the link is wrong."
          action={
            <Button asChild size="sm">
              <Link href="/projects">Back to projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.name}
            </h1>
            <ProjectStatusBadge status={data.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{data.projectCode}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {data.locationText}
            </span>
            <span>{data.propertyType}</span>
            <span>Created {formatDate(data.createdAt)}</span>
          </div>
          {data.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Archive
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">
            Properties ({data.properties.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({data.documents.length})
          </TabsTrigger>
          <TabsTrigger value="leads">
            Interested Leads ({data.interestedLeadsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.description || "No description yet."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatBlock
                  label="Total units"
                  value={data.properties.length}
                />
                <StatBlock
                  label="Available"
                  value={
                    data.properties.filter(
                      (p) => p.status === PropertyStatus.AVAILABLE,
                    ).length
                  }
                />
                <StatBlock
                  label="Sold"
                  value={
                    data.properties.filter(
                      (p) => p.status === PropertyStatus.SOLD,
                    ).length
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <PropertiesPanel
            projectId={projectId}
            properties={data.properties}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel
            projectId={projectId}
            documents={data.documents}
          />
        </TabsContent>

        <TabsContent value="leads">
          <ProjectOpportunitiesPanel projectId={projectId} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Archive this project?"
        description="Archiving marks the project inactive but preserves its data and history. It won't appear in the active list."
        confirmLabel="Archive"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
