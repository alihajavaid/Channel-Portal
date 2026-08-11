import { z } from "zod";
import { MODULE_KEYS } from "@/lib/constants/modules";

const PermissionsSchema = z.object(
  Object.fromEntries(MODULE_KEYS.map((k) => [k, z.boolean()])) as Record<
    (typeof MODULE_KEYS)[number],
    z.ZodBoolean
  >
);

export const UserCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    role: z.string().trim().min(1),
  })
  .extend(PermissionsSchema.shape);

export const UserUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: z.string().trim().min(1).optional(),
  })
  .extend(
    Object.fromEntries(MODULE_KEYS.map((k) => [k, z.boolean().optional()])) as Record<
      (typeof MODULE_KEYS)[number],
      z.ZodOptional<z.ZodBoolean>
    >
  );
