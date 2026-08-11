export type CustomerListItem = {
  id: string;
  company: string;
  primaryContact: string;
  email: string;
  plan: string;
  health: "Healthy" | "NeedsAttention" | "Critical";
  status: "Active" | "Renewed" | "AtRisk" | "Churned";
  renewalDate: string;
  notes: string | null;
  csmOwner: { id: string; name: string };
};

export function healthLabel(health: CustomerListItem["health"]): string {
  return health === "NeedsAttention" ? "Needs Attention" : health;
}

export function statusLabel(status: CustomerListItem["status"]): string {
  return status === "AtRisk" ? "At Risk" : status;
}

export function renewalAlert(renewalDate: string): "overdue" | "soon" | null {
  const days = (new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "overdue";
  if (days <= 30) return "soon";
  return null;
}
