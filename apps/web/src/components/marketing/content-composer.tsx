"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Sparkles,
  Send,
  Trash2,
  Mail,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import {
  campaignsApi,
  type MarketingContentVariation,
} from "@/lib/campaigns-api";
import {
  CampaignMessageStatus,
  CampaignType,
  MessageChannel,
  type CampaignMessage,
  type CampaignWithRelations,
} from "@realestate/shared";
import { cn } from "@/lib/utils";

interface ContentComposerProps {
  campaign: CampaignWithRelations;
  locked: boolean;
}

export function ContentComposer({ campaign, locked }: ContentComposerProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [channel, setChannel] = useState<MessageChannel>(
    campaign.type === CampaignType.EMAIL_BLAST
      ? MessageChannel.EMAIL
      : MessageChannel.WHATSAPP,
  );
  const [content, setContent] = useState("");
  const [aiTargetAudience, setAiTargetAudience] = useState("");
  const [aiVariations, setAiVariations] = useState<MarketingContentVariation[] | null>(
    null,
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const addMessageMut = useMutation({
    mutationFn: () =>
      campaignsApi.addMessage(campaign.id, { channel, content }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaign.id] });
      toast.show({ title: "Message added", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't add message",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const deleteMessageMut = useMutation({
    mutationFn: (messageId: string) => campaignsApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaign.id] });
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const generateMut = useMutation({
    mutationFn: () => {
      if (!campaign.projectId) {
        throw new Error("AI content needs a project attached to the campaign.");
      }
      const platform =
        channel === MessageChannel.EMAIL ? "email_blast" : "whatsapp_blast";
      return campaignsApi.generateContent({
        projectId: campaign.projectId,
        platform,
        targetAudience: aiTargetAudience || undefined,
      });
    },
    onSuccess: (res) => {
      setAiVariations(res.variations);
    },
    onError: (err) => {
      toast.show({
        title: "Generation failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Content</h2>
          <p className="text-sm text-muted-foreground">
            One or more messages — these get delivered to every matching
            audience member on execute.
          </p>
        </div>
      </div>

      {campaign.messages.length > 0 ? (
        <ul className="space-y-2">
          {campaign.messages.map((m) => (
            <CampaignMessageRow
              key={m.id}
              message={m}
              locked={locked || m.status === CampaignMessageStatus.SENT}
              onDelete={() => {
                if (confirm("Delete this message?")) {
                  deleteMessageMut.mutate(m.id);
                }
              }}
            />
          ))}
        </ul>
      ) : null}

      {!locked ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a new message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <FormField label="Channel">
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as MessageChannel)}
                  disabled={
                    campaign.type !== CampaignType.MULTI_CHANNEL &&
                    campaign.messages.length > 0
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(campaign.type === CampaignType.WHATSAPP_BLAST ||
                      campaign.type === CampaignType.MULTI_CHANNEL) && (
                      <SelectItem value={MessageChannel.WHATSAPP}>
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          WhatsApp
                        </span>
                      </SelectItem>
                    )}
                    {(campaign.type === CampaignType.EMAIL_BLAST ||
                      campaign.type === CampaignType.MULTI_CHANNEL) && (
                      <SelectItem value={MessageChannel.EMAIL}>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="hidden sm:block" />
            </div>
            <FormField label="Content" hint="Supports {{name}} merge token later">
              <Textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  channel === MessageChannel.EMAIL
                    ? "Subject: …\n\nBody…"
                    : "Write your WhatsApp broadcast message…"
                }
              />
            </FormField>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Input
                  value={aiTargetAudience}
                  onChange={(e) => setAiTargetAudience(e.target.value)}
                  placeholder="AI audience hint (e.g. first-time buyers)"
                  className="w-[260px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateMut.mutate()}
                  disabled={generateMut.isPending || !campaign.projectId}
                >
                  {generateMut.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI generate
                </Button>
              </div>
              <Button
                onClick={() => addMessageMut.mutate()}
                disabled={!content.trim() || addMessageMut.isPending}
              >
                {addMessageMut.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add to campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {aiVariations && aiVariations.length > 0 && !locked ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI variations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiVariations.map((v, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      v.approach === "headline_first"
                        ? "default"
                        : v.approach === "story_first"
                          ? "secondary"
                          : "warning"
                    }
                  >
                    {v.approach.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {v.charCount} chars
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {v.content}
                </pre>
                {v.hashtags ? (
                  <div className="flex flex-wrap gap-1.5 text-xs text-primary">
                    {v.hashtags.map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(i, v.content)}
                  >
                    {copiedIdx === i ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setContent(v.content);
                      toast.show({
                        title: "Pulled into composer",
                        description: "Edit + click Add to campaign when ready.",
                      });
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Use this
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CampaignMessageRow({
  message,
  locked,
  onDelete,
}: {
  message: CampaignMessage;
  locked: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <div
        className={cn(
          "mt-0.5 rounded-md p-1.5",
          message.channel === MessageChannel.EMAIL
            ? "bg-indigo-100 text-indigo-700"
            : "bg-emerald-100 text-emerald-700",
        )}
      >
        {message.channel === MessageChannel.EMAIL ? (
          <Mail className="h-3.5 w-3.5" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide">
            {message.channel}
          </span>
          <Badge
            variant={
              message.status === CampaignMessageStatus.SENT
                ? "success"
                : message.status === CampaignMessageStatus.SCHEDULED
                  ? "warning"
                  : "muted"
            }
          >
            {message.status}
          </Badge>
        </div>
        <pre className="mt-1.5 whitespace-pre-wrap font-sans text-sm">
          {message.content}
        </pre>
      </div>
      {!locked ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete message"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </li>
  );
}
