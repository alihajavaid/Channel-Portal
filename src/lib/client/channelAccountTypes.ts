export type ChannelAccountListItem = {
  id: string;
  company: string;
  primaryContact: string;
  email: string;
  region: string;
  focusArea: string;
  tier: "Bronze" | "Silver" | "Gold";
  status: "Active" | "OnHold" | "Churned";
  phase: number;
  checklistState: Record<string, Record<string, { done: boolean }>>;
  requestDate: string;
  satisfaction: number | null;
  opportunitiesGenerated: number | null;
  notes: string | null;
  owner: { id: string; name: string };
};
