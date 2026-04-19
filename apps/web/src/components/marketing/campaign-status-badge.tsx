import { Badge } from "@/components/ui/badge";
import {
  CampaignStatus,
  CampaignType,
  CAMPAIGN_TYPE_LABEL,
} from "@realestate/shared";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const STATUS_VARIANT: Record<
  CampaignStatus,
  "muted" | "warning" | "default" | "secondary" | "success" | "destructive"
> = {
  DRAFT: "muted",
  SCHEDULED: "warning",
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "success",
  FAILED: "destructive",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function CampaignTypeBadge({ type }: { type: CampaignType }) {
  return <Badge variant="outline">{CAMPAIGN_TYPE_LABEL[type]}</Badge>;
}
