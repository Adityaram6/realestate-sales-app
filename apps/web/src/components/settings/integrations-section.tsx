"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Mail, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { settingsApi, type IntegrationConfig } from "@/lib/settings-api";
import { extractApiError } from "@/lib/api-client";

const META: Record<
  IntegrationConfig["type"],
  {
    label: string;
    description: string;
    icon: typeof Send;
    fields: Array<{ key: string; label: string; hint?: string; type?: string }>;
    disabled?: string;
  }
> = {
  whatsapp: {
    label: "WhatsApp (Meta Cloud API)",
    description:
      "Send and receive WhatsApp messages through Meta's Cloud API. Webhook URL: /webhooks/whatsapp",
    icon: MessageSquare,
    fields: [
      {
        key: "phoneNumberId",
        label: "Phone number ID",
        hint: "From your Meta Business WhatsApp → phone number settings",
      },
      { key: "businessAccountId", label: "Business account ID" },
      {
        key: "accessToken",
        label: "Access token",
        type: "password",
        hint: "System user token with whatsapp_business_messaging scope",
      },
    ],
  },
  email: {
    label: "Email (SMTP)",
    description:
      "Outbound email via your own SMTP server. Threading is flat in Phase 1 — one message per row.",
    icon: Mail,
    fields: [
      { key: "smtpHost", label: "SMTP host", hint: "e.g. smtp.gmail.com" },
      { key: "smtpPort", label: "SMTP port", hint: "e.g. 587" },
      { key: "fromAddress", label: "From address" },
      { key: "username", label: "Username" },
    ],
  },
  sms: {
    label: "SMS (MSG91)",
    description:
      "DLT-compliant transactional SMS via MSG91. Requires DLT template approval (3–7 days) before you can send promotional content.",
    icon: Send,
    fields: [
      {
        key: "authKey",
        label: "MSG91 auth key",
        type: "password",
        hint: "From MSG91 dashboard → API tab",
      },
      {
        key: "senderId",
        label: "Sender ID",
        hint: "6-character DLT-registered sender, e.g. REALTY",
      },
      {
        key: "templateId",
        label: "Template ID",
        hint: "DLT template ID approved for this sender",
      },
    ],
  },
};

export function IntegrationsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Wire external channels so the AI assistant can send and receive.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        data?.map((integration) => (
          <IntegrationCard key={integration.type} integration={integration} />
        ))
      )}
    </div>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationConfig }) {
  const meta = META[integration.type];
  const Icon = meta.icon;
  const [local, setLocal] = useState<Record<string, string>>(
    integration.config,
  );
  const toast = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: () => settingsApi.updateIntegration(integration.type, local),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] });
      toast.show({ title: "Integration saved", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const statusVariant =
    integration.status === "connected"
      ? ("success" as const)
      : integration.status === "error"
        ? ("destructive" as const)
        : ("muted" as const);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
        </div>
        <Badge variant={statusVariant}>
          {integration.status === "connected"
            ? "Connected"
            : integration.status === "error"
              ? "Error"
              : "Not configured"}
        </Badge>
      </CardHeader>
      <CardContent>
        {meta.disabled ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            {meta.disabled}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {meta.fields.map((f) => (
                <FormField key={f.key} label={f.label} hint={f.hint}>
                  <Input
                    type={f.type ?? "text"}
                    value={local[f.key] ?? ""}
                    onChange={(e) =>
                      setLocal((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  />
                </FormField>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
