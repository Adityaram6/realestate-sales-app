"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  Loader2,
  UserX,
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
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  LeadScoreDot,
  LeadStatusBadge,
} from "@/components/leads/lead-status-badge";
import { LeadOpportunitiesPanel } from "@/components/opportunities/lead-opportunities-panel";
import { AiMessageGenerator } from "@/components/ai/ai-message-generator";
import { AiStrategistPanel } from "@/components/ai/ai-strategist-panel";
import { AiScorePanel } from "@/components/ai/ai-score-panel";
import { Timeline } from "@/components/activities/timeline";
import { MessageThread } from "@/components/messages/message-thread";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { leadsApi } from "@/lib/leads-api";
import { extractApiError } from "@/lib/api-client";
import { formatCurrencyINR, formatDateTime } from "@/lib/utils";
import { UserRole } from "@realestate/shared";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const leadId = params.id;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAnonymize, setConfirmAnonymize] = useState(false);
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadsApi.get(leadId),
    enabled: Boolean(leadId),
  });

  const deleteMut = useMutation({
    mutationFn: () => leadsApi.remove(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.show({
        title: "Lead removed",
        variant: "success",
      });
      router.push("/leads");
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const anonymizeMut = useMutation({
    mutationFn: () => leadsApi.anonymize(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.show({
        title: "Lead anonymized",
        description: "PII has been zeroed out and an audit log written.",
        variant: "success",
      });
      router.push("/leads");
    },
    onError: (err) => {
      toast.show({
        title: "Anonymize failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            All leads
          </Link>
        </Button>
        <EmptyState title="Lead not found" />
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
        <Link href="/leads">
          <ArrowLeft className="h-4 w-4" />
          All leads
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.name}
            </h1>
            <LeadStatusBadge status={data.status} />
            {data.score != null ? <LeadScoreDot score={data.score} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {data.phone}
            </span>
            {data.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {data.email}
              </span>
            ) : null}
            {data.locationPreference ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {data.locationPreference}
              </span>
            ) : null}
            {data.source ? <span>via {data.source}</span> : null}
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
            <Link href={`/leads/${leadId}/edit`}>
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
            Delete
          </Button>
          {isAdmin ? (
            <Button
              variant="outline"
              onClick={() => setConfirmAnonymize(true)}
              disabled={anonymizeMut.isPending}
              title="DPDP Right to Erasure"
            >
              {anonymizeMut.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              Anonymize
            </Button>
          ) : null}
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI assistant</TabsTrigger>
          <TabsTrigger value="projects">Interested Projects</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoBlock
              icon={IndianRupee}
              label="Budget range"
              value={
                data.budgetMin || data.budgetMax
                  ? `${formatCurrencyINR(data.budgetMin)} – ${formatCurrencyINR(data.budgetMax)}`
                  : "Not set"
              }
            />
            <InfoBlock
              icon={MapPin}
              label="Location preference"
              value={data.locationPreference ?? "—"}
            />
            <InfoBlock
              icon={Sparkles}
              label="AI score"
              value={data.score != null ? String(data.score) : "—"}
            />
          </div>

          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                DPDP consent
              </div>
              <div className="text-sm text-muted-foreground">
                {data.consentGiven ? (
                  <>
                    Consent captured on{" "}
                    {formatDateTime(data.consentTimestamp)}.
                  </>
                ) : (
                  "No consent on file — do not contact until captured."
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <AiStrategistPanel leadId={leadId} />
            <AiScorePanel leadId={leadId} />
          </div>
          <AiMessageGenerator leadId={leadId} leadName={data.name} />
        </TabsContent>

        <TabsContent value="projects">
          <LeadOpportunitiesPanel leadId={leadId} leadName={data.name} />
        </TabsContent>

        <TabsContent value="timeline">
          <Timeline leadId={leadId} />
        </TabsContent>

        <TabsContent value="messages">
          <MessageThread leadId={leadId} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this lead?"
        description="Soft delete — the record stays but is hidden from lists. To permanently erase PII, use Anonymize."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />

      <ConfirmDialog
        open={confirmAnonymize}
        onOpenChange={setConfirmAnonymize}
        title="Anonymize this lead? (DPDP Right to Erasure)"
        description="Name, phone, email, and custom fields will be permanently zeroed out. Opportunity and message history stays for referential integrity. Audit log written. This cannot be undone."
        confirmLabel="Anonymize permanently"
        destructive
        loading={anonymizeMut.isPending}
        onConfirm={() => anonymizeMut.mutate()}
      />
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-base font-medium">{value}</div>
    </div>
  );
}
