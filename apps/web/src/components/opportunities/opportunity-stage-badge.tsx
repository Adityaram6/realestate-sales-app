import { Badge } from "@/components/ui/badge";
import {
  OpportunityStage,
  OPPORTUNITY_STAGE_LABEL,
} from "@realestate/shared";

const VARIANT: Record<
  OpportunityStage,
  "default" | "secondary" | "warning" | "success" | "destructive" | "muted"
> = {
  [OpportunityStage.NEW]: "secondary",
  [OpportunityStage.CONTACTED]: "secondary",
  [OpportunityStage.SITE_VISIT_SCHEDULED]: "warning",
  [OpportunityStage.SITE_VISIT_DONE]: "warning",
  [OpportunityStage.NEGOTIATION]: "default",
  [OpportunityStage.CLOSED_WON]: "success",
  [OpportunityStage.CLOSED_LOST]: "destructive",
};

export function OpportunityStageBadge({
  stage,
}: {
  stage: OpportunityStage;
}) {
  return (
    <Badge variant={VARIANT[stage]}>{OPPORTUNITY_STAGE_LABEL[stage]}</Badge>
  );
}
