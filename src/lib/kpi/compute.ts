import "server-only";
import { prisma } from "@/lib/db/prisma";

// The brief names these KPIs without giving exact formulas. Definitions below are the
// pragmatic, documented choices made for this build — computed live via Prisma
// aggregations/counts (no caching), since a handful of queries over a CRM-scale dataset
// costs single-digit milliseconds and a cache would only add an invalidation bug surface.
export async function getDashboardKpis() {
  const [
    prospectCount,
    partnerCount, // == count(phase >= 4)
    phaseGte2Count,
    phaseGte3Count,
    phaseGte5Count,
    phaseGte8Count,
    phaseGte9Count,
    phase9ActiveCount,
    phase9NotChurnedCount,
    satisfactionAgg,
    opportunitiesAgg,
    customerCount,
    customersAtRisk,
    customersChurned,
    accountsByPhaseRaw,
    recentActivity,
  ] = await Promise.all([
    prisma.channelAccount.count({ where: { phase: { lte: 3 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 4 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 2 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 3 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 5 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 8 } } }),
    prisma.channelAccount.count({ where: { phase: { gte: 9 } } }),
    prisma.channelAccount.count({ where: { phase: 9, status: "Active" } }),
    prisma.channelAccount.count({ where: { phase: 9, status: { not: "Churned" } } }),
    prisma.channelAccount.aggregate({ _avg: { satisfaction: true }, where: { satisfaction: { not: null } } }),
    prisma.channelAccount.aggregate({ _sum: { opportunitiesGenerated: true } }),
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "AtRisk" } }),
    prisma.customer.count({ where: { status: "Churned" } }),
    prisma.channelAccount.groupBy({ by: ["phase"], _count: { _all: true } }),
    prisma.activityLogEntry.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const accountsByPhase = Array.from({ length: 9 }, (_, i) => {
    const phase = i + 1;
    const found = accountsByPhaseRaw.find((r) => r.phase === phase);
    return { phase, count: found?._count._all ?? 0 };
  });

  const pct = (numerator: number, denominator: number) =>
    denominator === 0 ? null : Math.round((numerator / denominator) * 1000) / 10;

  return {
    prospectCount,
    partnerCount,
    // % of intake that made it past Qualification (phase 2) into Discovery or beyond.
    qualifiedConversionRate: pct(phaseGte3Count, phaseGte2Count),
    // % of Partner-track accounts that have moved past NDA & Contract Execution (phase 4).
    ndaCompletionRate: pct(phaseGte5Count, partnerCount),
    // % of accounts that reached Training & Certification (phase 8) and completed it (phase 9).
    trainingCompletionRate: pct(phaseGte9Count, phaseGte8Count),
    activeEngagedPartnersAtPhase9: phase9ActiveCount,
    // % of accounts that ever reached phase 9 which are not Churned.
    longTermRetention: pct(phase9NotChurnedCount, phaseGte9Count),
    avgPartnerSatisfaction: satisfactionAgg._avg.satisfaction,
    totalPartnerGeneratedOpportunities: opportunitiesAgg._sum.opportunitiesGenerated ?? 0,
    customerCount,
    customersAtRisk,
    customersChurned,
    accountsByPhase,
    recentActivity,
  };
}
