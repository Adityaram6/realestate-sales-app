import { Check, CheckCheck, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageStatus } from "@realestate/shared";
import type { MessageStatus as MessageStatusT } from "@realestate/shared";

export function MessageStatusIndicator({
  status,
}: {
  status: MessageStatusT;
}) {
  const common = "h-3.5 w-3.5";
  switch (status) {
    case MessageStatus.SENT:
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Check className={common} />
          <span className="text-[10px]">Sent</span>
        </span>
      );
    case MessageStatus.DELIVERED:
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <CheckCheck className={common} />
          <span className="text-[10px]">Delivered</span>
        </span>
      );
    case MessageStatus.READ:
      return (
        <span className="inline-flex items-center gap-1 text-sky-600">
          <CheckCheck className={cn(common, "text-sky-600")} />
          <span className="text-[10px]">Read</span>
        </span>
      );
    case MessageStatus.FAILED:
      return (
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertCircle className={common} />
          <span className="text-[10px]">Failed</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className={common} />
        </span>
      );
  }
}
