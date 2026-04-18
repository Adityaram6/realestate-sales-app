"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  Copy,
  Send,
  Check,
  Wand2,
  MessageSquare,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { aiApi } from "@/lib/ai-api";
import { extractApiError } from "@/lib/api-client";
import {
  AiIntent,
  AiTone,
} from "@realestate/shared";
import type { MessageVariation } from "@/lib/ai-mock";

const INTENT_OPTIONS: Array<{ value: AiIntent; label: string }> = [
  { value: AiIntent.FOLLOW_UP, label: "Follow-up" },
  { value: AiIntent.SITE_VISIT, label: "Site visit push" },
  { value: AiIntent.NEGOTIATION, label: "Negotiation" },
  { value: AiIntent.CLOSING, label: "Closing" },
  { value: AiIntent.RE_ENGAGEMENT, label: "Re-engagement" },
  { value: AiIntent.CROSS_SELL, label: "Cross-sell" },
];

const TONE_OPTIONS: Array<{ value: AiTone; label: string }> = [
  { value: AiTone.PROFESSIONAL, label: "Professional" },
  { value: AiTone.FRIENDLY, label: "Friendly" },
  { value: AiTone.AGGRESSIVE, label: "Aggressive" },
];

const APPROACH_LABEL: Record<MessageVariation["approach"], string> = {
  soft: "Soft approach",
  direct: "Direct approach",
  urgency: "Urgency-driven",
};

interface AiMessageGeneratorProps {
  leadId: string;
  leadName: string;
  opportunityId?: string;
  defaultIntent?: AiIntent;
}

export function AiMessageGenerator({
  leadId,
  leadName,
  opportunityId,
  defaultIntent,
}: AiMessageGeneratorProps) {
  const toast = useToast();
  const [intent, setIntent] = useState<AiIntent>(
    defaultIntent ?? AiIntent.FOLLOW_UP,
  );
  const [tone, setTone] = useState<AiTone>(AiTone.PROFESSIONAL);
  const [variations, setVariations] = useState<MessageVariation[] | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generateMut = useMutation({
    mutationFn: () =>
      aiApi.generateMessage({
        leadId,
        opportunityId,
        intent,
        tone,
      }),
    onSuccess: (res) => {
      setVariations(res.variations);
      setEdited({});
      if (res.suggestedIntent && res.suggestedIntent !== intent) {
        toast.show({
          title: "AI suggests a different intent",
          description: `Given the context, "${labelFor(res.suggestedIntent)}" may work better.`,
        });
      }
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

  const handleSend = (text: string) => {
    // Messaging wire-up arrives with the Communication module. For now,
    // copy + toast the user in the right direction.
    navigator.clipboard.writeText(text);
    toast.show({
      title: "Copied — send from your channel",
      description:
        "The messaging module will let you send directly to WhatsApp/email.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Compose with AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Intent
            </label>
            <Select
              value={intent}
              onValueChange={(v) => setIntent(v as AiIntent)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tone
            </label>
            <Select value={tone} onValueChange={(v) => setTone(v as AiTone)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="w-full sm:w-auto"
            >
              {generateMut.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>

        {!variations && !generateMut.isPending ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Pick an intent and tone, then generate 3 ranked variations for{" "}
            {leadName}.
          </div>
        ) : null}

        {variations && variations.length > 0 ? (
          <ol className="space-y-3">
            {variations.map((v, idx) => {
              const text = edited[idx] ?? v.text;
              const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
              return (
                <li
                  key={idx}
                  className="space-y-2 rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          v.approach === "soft"
                            ? "secondary"
                            : v.approach === "direct"
                              ? "default"
                              : "warning"
                        }
                      >
                        {APPROACH_LABEL[v.approach]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {wordCount} words
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <ScoreChip label="P" value={v.scores.personalization} />
                      <ScoreChip label="A" value={v.scores.actionability} />
                      <ScoreChip label="C" value={v.scores.clarity} />
                    </div>
                  </div>
                  <Textarea
                    rows={3}
                    value={text}
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
                    className="resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(idx, text)}
                    >
                      {copiedIdx === idx ? (
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
                    <Button size="sm" onClick={() => handleSend(text)}>
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold uppercase">
        {label}
      </span>
      {value}
    </span>
  );
}

function labelFor(intent: AiIntent) {
  return INTENT_OPTIONS.find((o) => o.value === intent)?.label ?? intent;
}
