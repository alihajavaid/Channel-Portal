import { noPermissions, allPermissions, type Permissions } from "./modules";

export type RoleTemplate = {
  key: string;
  label: string;
  permissions: Permissions;
};

// UI convenience only, used to prefill the Access Management form's checkboxes when an admin
// picks a role. The persisted source of truth is always the six columns on User — these
// templates are never stored or referenced by id anywhere else.
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "admin",
    label: "Admin",
    permissions: allPermissions(),
  },
  {
    key: "channel",
    label: "Channel",
    permissions: { ...noPermissions(), dashboard: true, prospects: true, partners: true },
  },
  {
    key: "sales",
    label: "Sales",
    permissions: { ...noPermissions(), dashboard: true, prospects: true, partners: true },
  },
  {
    key: "technical",
    label: "Technical",
    permissions: { ...noPermissions(), dashboard: true, partners: true },
  },
  {
    key: "legal",
    label: "Legal",
    permissions: { ...noPermissions(), dashboard: true, partners: true },
  },
  {
    key: "customer_success",
    label: "Customer Success",
    permissions: { ...noPermissions(), dashboard: true, customers: true },
  },
];
