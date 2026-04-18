"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ProjectForm } from "@/components/projects/project-form";
import { projectsApi } from "@/lib/projects-api";

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => projectsApi.get(params.id),
    enabled: Boolean(params.id),
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href={`/projects/${params.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>
      </Button>

      {isError ? (
        <EmptyState
          title="Project not found"
          description="The project may have been archived or deleted."
        />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            title={`Edit ${data.name}`}
            description={data.projectCode}
          />
          <ProjectForm initial={data} />
        </>
      )}
    </div>
  );
}
