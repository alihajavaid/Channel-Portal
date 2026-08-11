import { z } from "zod";

export const CustomerCreateSchema = z.object({
  company: z.string().trim().min(1),
  primaryContact: z.string().trim().min(1),
  email: z.string().trim().email(),
  plan: z.string().trim().min(1),
  csmOwnerId: z.string().min(1),
  health: z.enum(["Healthy", "NeedsAttention", "Critical"]),
  status: z.enum(["Active", "Renewed", "AtRisk", "Churned"]),
  renewalDate: z.string().min(1),
  notes: z.string().optional(),
});

export const CustomerUpdateSchema = CustomerCreateSchema.partial();
