export type DeliverableSeedDef = {
  name: string;
  description: string;
  link: string;
  tasks: string[];
};

// The 10 fixed internal registers the Channel team owes, from the Partner Channel Program
// doc. Seeded once; task completion drives the derived progress/status shown in the UI.
export const DELIVERABLES: DeliverableSeedDef[] = [
  {
    name: "Partner Request Register",
    description: "Tracks every incoming partner request from submission through intake.",
    link: "https://example.com/registers/partner-request",
    tasks: [
      "Register template created",
      "Shared with the Channel team",
      "First requests logged",
      "Review cadence agreed",
    ],
  },
  {
    name: "Qualification Assessment",
    description: "Scoring and sign-off process for qualifying prospective partners.",
    link: "https://example.com/registers/qualification-assessment",
    tasks: [
      "Scoring criteria defined",
      "Assessment template built",
      "Sign-off process agreed",
      "First assessment completed",
    ],
  },
  {
    name: "Discovery Meeting Notes",
    description: "Standardized notes and follow-up tracking for discovery calls.",
    link: "https://example.com/registers/discovery-notes",
    tasks: [
      "Notes template created",
      "Filed after each call",
      "Next steps tracked",
      "Summary shared with stakeholders",
    ],
  },
  {
    name: "NDA Tracker",
    description: "Tracks NDA issuance, signature status, and archival.",
    link: "https://example.com/registers/nda-tracker",
    tasks: [
      "Tracker created",
      "Legal NDA template linked",
      "Signature status tracked",
      "Archive process defined",
    ],
  },
  {
    name: "Partnership Agreement Register",
    description: "Tracks partnership agreements from drafting through renewal.",
    link: "https://example.com/registers/partnership-agreement",
    tasks: [
      "Register created",
      "Agreement template linked",
      "Signed agreements filed",
      "Renewal dates tracked",
    ],
  },
  {
    name: "Partner Approval Record",
    description: "Records internal approval and welcome communication for new partners.",
    link: "https://example.com/registers/partner-approval",
    tasks: [
      "Approval workflow defined",
      "Sign-off captured per partner",
      "Status assignment logged",
      "Welcome communication sent",
    ],
  },
  {
    name: "Onboarding Checklist",
    description: "Standard checklist for bringing a new partner onto the platform.",
    link: "https://example.com/registers/onboarding-checklist",
    tasks: [
      "Checklist created",
      "Account/portal setup steps defined",
      "Key contacts template ready",
      "Implementation roadmap template ready",
    ],
  },
  {
    name: "Enablement Materials",
    description: "Product, sales, and technical materials used to enable partners.",
    link: "https://example.com/registers/enablement-materials",
    tasks: [
      "Product overview deck ready",
      "Sales collateral ready",
      "Technical documentation ready",
      "Materials repository organized",
    ],
  },
  {
    name: "Training & Certification Records",
    description: "Tracks partner training curriculum, completion, and certification.",
    link: "https://example.com/registers/training-certification",
    tasks: [
      "Training curriculum defined",
      "Certification criteria set",
      "Completion tracking sheet built",
      "Badge/certificate issuance process ready",
    ],
  },
  {
    name: "Partner Success Dashboard",
    description: "Public-facing dashboard highlighting successful partners.",
    link: "https://example.com/registers/partner-success-dashboard",
    tasks: [
      "Dashboard built",
      "Data source connected",
      'Visible on "Find a Partner" page',
      "Refresh cadence set",
    ],
  },
];
