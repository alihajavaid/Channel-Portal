import "server-only";
import { phaseGroup } from "@/lib/constants/phaseChecklists";

type ChannelAccountModule = "prospects" | "partners";

// A ChannelAccount is one record moving through phases 1-9; phases 1-3 are gated by the
// `prospects` permission and 4-9 by `partners`. Unlike most routes, this can't be a single
// static module check — the same record's required permission changes as it moves phases,
// so route handlers resolve the record first and check against its current (and, for phase
// moves, target) phase.
export function moduleForPhase(phase: number): ChannelAccountModule {
  return phaseGroup(phase) === "Prospect" ? "prospects" : "partners";
}

export function canAccessPhase(
  user: { prospects: boolean; partners: boolean },
  phase: number
): boolean {
  return user[moduleForPhase(phase)];
}
