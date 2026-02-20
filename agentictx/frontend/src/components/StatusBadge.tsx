import type { EngagementStatus, UseCaseStatus } from "@/types";

const LABELS: Record<string, string> = {
  active: "Active",
  archived: "Archived",
  pending: "Pending",
  discovery: "Discovery",
  agentic_design: "Agentic Design",
  business_case: "Business Case",
  complete: "Complete",
};

interface Props {
  status: EngagementStatus | UseCaseStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>
  );
}
