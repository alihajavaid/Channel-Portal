import { z } from "zod";

export const ChannelAccountCreateSchema = z.object({
  company: z.string().trim().min(1),
  primaryContact: z.string().trim().min(1),
  email: z.string().trim().email(),
  region: z.string().trim().min(1),
  focusArea: z.string().trim().min(1),
  ownerId: z.string().min(1),
  tier: z.enum(["Bronze", "Silver", "Gold"]),
  status: z.enum(["Active", "OnHold", "Churned"]),
  requestDate: z.string().min(1),
  notes: z.string().optional(),
});

export const ChannelAccountUpdateSchema = ChannelAccountCreateSchema.partial().extend({
  satisfaction: z.number().int().min(1).max(5).optional().nullable(),
  opportunitiesGenerated: z.number().int().min(0).optional().nullable(),
});

export const PhaseMoveSchema = z.object({
  phase: z.number().int().min(1).max(9),
});

export const ChecklistToggleSchema = z.object({
  phase: z.number().int().min(1).max(9),
  itemKey: z.string().min(1),
  done: z.boolean(),
});
