import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@realestate/shared";

const LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
};

const VARIANTS: Record<
  ProjectStatus,
  "default" | "secondary" | "muted" | "warning"
> = {
  ACTIVE: "default",
  DRAFT: "warning",
  INACTIVE: "muted",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
