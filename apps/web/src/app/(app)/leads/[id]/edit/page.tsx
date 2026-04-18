"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LeadForm } from "@/components/leads/lead-form";
import { leadsApi } from "@/lib/leads-api";

export default function EditLeadPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead", params.id],
    queryFn: () => leadsApi.get(params.id),
    enabled: Boolean(params.id),
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href={`/leads/${params.id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to lead
        </Link>
      </Button>
      {isError ? (
        <EmptyState title="Lead not found" />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <PageHeader title={`Edit ${data.name}`} />
          <LeadForm initial={data} />
        </>
      )}
    </div>
  );
}
