import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const NewPasswordSchema = z
  .string()
  .min(8, "Must be at least 8 characters long")
  .regex(/[a-zA-Z]/, "Must contain at least one letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Must contain at least one special character");

export const SetPasswordSchema = z.object({
  newPassword: NewPasswordSchema,
});

export const TotpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Must be a 6-digit code"),
});

export const MfaVerifySchema = z.object({
  code: z.string().min(6),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: NewPasswordSchema,
});

export const RegenerateRecoveryCodesSchema = z.object({
  currentPassword: z.string().min(1),
});
