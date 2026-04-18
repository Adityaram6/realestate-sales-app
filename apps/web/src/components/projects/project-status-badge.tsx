import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@realestate/shared";

const LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  draft: "Draft",
  inactive: "Inactive",
};

const VARIANTS: Record<
  ProjectStatus,
  "default" | "secondary" | "muted" | "warning"
> = {
  active: "default",
  draft: "warning",
  inactive: "muted",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
