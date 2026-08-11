import "server-only";

const MAX_ATTEMPTS_BEFORE_LOCK = 5;
// Escalating backoff keyed by (attempts - MAX_ATTEMPTS_BEFORE_LOCK), capped at the last entry.
const LOCK_MINUTES_BY_STAGE = [1, 5, 15, 60];

export function isLocked(user: { lockUntil: Date | null }): boolean {
  return Boolean(user.lockUntil && user.lockUntil.getTime() > Date.now());
}

export function computeLockAfterFailure(failedLoginAttempts: number): {
  failedLoginAttempts: number;
  lockUntil: Date | null;
} {
  const attempts = failedLoginAttempts + 1;
  if (attempts < MAX_ATTEMPTS_BEFORE_LOCK) {
    return { failedLoginAttempts: attempts, lockUntil: null };
  }
  const stage = Math.min(
    attempts - MAX_ATTEMPTS_BEFORE_LOCK,
    LOCK_MINUTES_BY_STAGE.length - 1
  );
  const minutes = LOCK_MINUTES_BY_STAGE[stage];
  return { failedLoginAttempts: attempts, lockUntil: new Date(Date.now() + minutes * 60_000) };
}

export const resetLockoutFields = {
  failedLoginAttempts: 0,
  lockUntil: null as Date | null,
};
