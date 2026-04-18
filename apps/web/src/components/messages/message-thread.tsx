"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { MessageStatusIndicator } from "@/components/messages/message-status-indicator";
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import { messagesApi, type Message } from "@/lib/messages-api";
import { formatDateTime, formatRelativeTime, cn } from "@/lib/utils";
import { MessageChannel, MessageDirection } from "@realestate/shared";

interface MessageThreadProps {
  leadId: string;
  opportunityId?: string;
}

export function MessageThread({ leadId, opportunityId }: MessageThreadProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<MessageChannel>(
    MessageChannel.WHATSAPP,
  );
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", leadId],
    queryFn: () => messagesApi.list(leadId),
    // Poll to pick up the simulated sent → delivered → read lifecycle.
    refetchInterval: (q) => {
      const msgs = q.state.data as Message[] | undefined;
      if (!msgs) return false;
      const hasPending = msgs.some(
        (m) =>
          m.direction === MessageDirection.OUTBOUND &&
          (m.status === "sent" || m.status === "delivered"),
      );
      return hasPending ? 1500 : false;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [data?.length]);

  const sendMut = useMutation({
    mutationFn: () =>
      messagesApi.send({
        leadId,
        opportunityId,
        channel,
        messageText: text,
      }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", leadId] });
      queryClient.invalidateQueries({ queryKey: ["timeline", leadId] });
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't send",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-[580px] flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Conversation</h3>
          <p className="text-xs text-muted-foreground">
            WhatsApp via Meta Cloud API (simulated). Email coming next.
          </p>
        </div>
        <Select
          value={channel}
          onValueChange={(v) => setChannel(v as MessageChannel)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MessageChannel.WHATSAPP}>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </span>
            </SelectItem>
            <SelectItem value={MessageChannel.EMAIL}>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
            </SelectItem>
            <SelectItem value={MessageChannel.SMS}>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                SMS
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4"
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-3/5" />
            <Skeleton className="ml-auto h-14 w-2/3" />
            <Skeleton className="h-14 w-1/2" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Send the first message — it'll appear here instantly."
            />
          </div>
        ) : (
          data.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (text.trim()) sendMut.mutate();
              }
            }}
            placeholder={
              channel === MessageChannel.WHATSAPP
                ? "Type a WhatsApp message…"
                : "Type an email…"
            }
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={() => sendMut.mutate()}
            disabled={!text.trim() || sendMut.isPending}
          >
            {sendMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Tip: Cmd/Ctrl + Enter to send.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === MessageDirection.OUTBOUND;
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-1 rounded-lg px-3 py-2 text-sm shadow-sm",
          outbound
            ? "bg-primary text-primary-foreground"
            : "bg-background",
        )}
      >
        <div className="whitespace-pre-wrap">{message.messageText}</div>
        <div
          className={cn(
            "flex items-center justify-end gap-2 text-[10px]",
            outbound ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
          title={formatDateTime(message.createdAt)}
        >
          <span>{formatRelativeTime(message.createdAt)}</span>
          {outbound ? (
            <MessageStatusIndicator status={message.status} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
