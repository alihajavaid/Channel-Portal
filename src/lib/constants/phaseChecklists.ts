export type ChecklistItemDef = { key: string; label: string };

export type PhaseDef = {
  phase: number;
  name: string;
  group: "Prospect" | "Partner";
  items: ChecklistItemDef[];
};

// Fixed 9-phase lifecycle from the DataGateways Partner Channel Program. Item keys are
// stable identifiers stored in ChannelAccount.checklistState — never reuse or reorder-break
// a key once data exists, since existing rows reference these keys directly.
export const PHASES: PhaseDef[] = [
  {
    phase: 1,
    name: "Partner Request",
    group: "Prospect",
    items: [
      { key: "request_submitted", label: "Request submitted" },
      { key: "confirmation_sent", label: "Confirmation sent" },
      { key: "intake_form_completed", label: "Intake form completed" },
      { key: "registered_owner_assigned", label: "Registered & owner assigned" },
    ],
  },
  {
    phase: 2,
    name: "Partner Qualification",
    group: "Prospect",
    items: [
      { key: "company_profile", label: "Company profile" },
      { key: "business_capabilities", label: "Business capabilities" },
      { key: "industry_focus", label: "Industry focus" },
      { key: "geographic_coverage", label: "Geographic coverage" },
      { key: "technical_expertise", label: "Technical expertise" },
      { key: "sales_capability", label: "Sales capability" },
      { key: "strategic_alignment", label: "Strategic alignment" },
    ],
  },
  {
    phase: 3,
    name: "Discovery",
    group: "Prospect",
    items: [
      { key: "meeting_scheduled", label: "Meeting scheduled" },
      { key: "business_overview", label: "Business overview" },
      { key: "target_markets", label: "Target markets" },
      { key: "technical_capabilities", label: "Technical capabilities" },
      { key: "sales_approach_customer_base", label: "Sales approach / customer base" },
      { key: "summary_documented", label: "Summary documented" },
    ],
  },
  {
    phase: 4,
    name: "NDA & Contract Execution",
    group: "Partner",
    items: [
      { key: "nda_issued", label: "NDA issued" },
      { key: "agreement_drafted", label: "Agreement drafted" },
      { key: "legal_review", label: "Legal review" },
      { key: "signatures_secured", label: "Signatures secured" },
      { key: "documentation_archived", label: "Documentation archived" },
    ],
  },
  {
    phase: 5,
    name: "Partnership Approval",
    group: "Partner",
    items: [
      { key: "internal_approval", label: "Internal approval" },
      { key: "partnership_confirmed", label: "Partnership confirmed" },
      { key: "status_assigned", label: "Status assigned" },
      { key: "welcome_sent", label: "Welcome sent" },
    ],
  },
  {
    phase: 6,
    name: "Partner Onboarding",
    group: "Partner",
    items: [
      { key: "account_portal_access", label: "Account / portal access" },
      { key: "docs_shared", label: "Docs shared" },
      { key: "key_contacts_introduced", label: "Key contacts introduced" },
      { key: "permissions_configured", label: "Permissions configured" },
      { key: "roadmap_provided", label: "Roadmap provided" },
      { key: "checklist_complete", label: "Checklist complete" },
    ],
  },
  {
    phase: 7,
    name: "Enablement & Demonstration",
    group: "Partner",
    items: [
      { key: "product_overview", label: "Product overview" },
      { key: "platform_capabilities", label: "Platform capabilities" },
      { key: "licensing", label: "Licensing" },
      { key: "deployment_options", label: "Deployment options" },
      { key: "sales_positioning", label: "Sales positioning" },
      { key: "demo", label: "Demo" },
      { key: "collateral_shared", label: "Collateral shared" },
    ],
  },
  {
    phase: 8,
    name: "Training & Certification",
    group: "Partner",
    items: [
      { key: "product_fundamentals", label: "Product fundamentals" },
      { key: "technical_overview", label: "Technical overview" },
      { key: "sales_enablement", label: "Sales enablement" },
      { key: "implementation_best_practices", label: "Implementation best practices" },
      { key: "customer_engagement_process", label: "Customer engagement process" },
      { key: "support_procedures", label: "Support procedures" },
      { key: "certification_issued", label: "Certification issued" },
    ],
  },
  {
    phase: 9,
    name: "Customer Success & Ongoing Engagement",
    group: "Partner",
    items: [
      { key: "business_reviews", label: "Business reviews" },
      { key: "product_updates", label: "Product updates" },
      { key: "support_coordination", label: "Support coordination" },
      { key: "joint_opportunities", label: "Joint opportunities" },
      { key: "performance_reviews", label: "Performance reviews" },
      { key: "enablement_refreshes", label: "Enablement refreshes" },
    ],
  },
];

export const PHASE_BY_NUMBER = new Map(PHASES.map((p) => [p.phase, p]));

export function phaseGroup(phase: number): "Prospect" | "Partner" {
  return phase <= 3 ? "Prospect" : "Partner";
}

export type ChecklistState = Record<
  string,
  Record<string, { done: boolean; at?: string; by?: string }>
>;

export function emptyChecklistState(): ChecklistState {
  const state: ChecklistState = {};
  for (const p of PHASES) {
    state[String(p.phase)] = {};
    for (const item of p.items) {
      state[String(p.phase)][item.key] = { done: false };
    }
  }
  return state;
}

export function checklistProgress(state: ChecklistState, phase: number) {
  const def = PHASE_BY_NUMBER.get(phase);
  if (!def) return { checked: 0, total: 0 };
  const phaseState = state[String(phase)] ?? {};
  const checked = def.items.filter((item) => phaseState[item.key]?.done).length;
  return { checked, total: def.items.length };
}

export function isItemDone(state: ChecklistState, phase: number, key: string): boolean {
  return Boolean(state[String(phase)]?.[key]?.done);
}
