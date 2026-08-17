import { requireModule } from "@/lib/authz/dal";
import { getDashboardKpis } from "@/lib/kpi/compute";
import { StatTile } from "@/components/dashboard/StatTile";
import { AccountsByPhaseChart } from "@/components/dashboard/AccountsByPhaseChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </h2>
  );
}

export default async function DashboardPage() {
  const session = await requireModule("dashboard");
  const kpis = await getDashboardKpis();
  const pctLabel = (v: number | null) => (v === null ? "—" : `${v}%`);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        {session.user.access && <ExportButtons />}
      </div>

      <section>
        <SectionLabel>Pipeline</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Prospects" value={kpis.prospectCount} tone="brand" />
          <StatTile label="Partners" value={kpis.partnerCount} tone="brand" />
          <StatTile label="Qualified conversion rate" value={pctLabel(kpis.qualifiedConversionRate)} tone="brand" />
          <StatTile label="NDA completion rate" value={pctLabel(kpis.ndaCompletionRate)} tone="brand" />
          <StatTile label="Training completion rate" value={pctLabel(kpis.trainingCompletionRate)} tone="brand" />
        </div>
      </section>

      <section>
        <SectionLabel>Partner health</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Active & engaged partners (phase 9)" value={kpis.activeEngagedPartnersAtPhase9} tone="emerald" />
          <StatTile label="Long-term retention" value={pctLabel(kpis.longTermRetention)} tone="emerald" />
          <StatTile
            label="Avg. partner satisfaction"
            value={kpis.avgPartnerSatisfaction ? kpis.avgPartnerSatisfaction.toFixed(1) : "—"}
            tone="emerald"
          />
          <StatTile label="Partner-generated opportunities" value={kpis.totalPartnerGeneratedOpportunities} tone="emerald" />
        </div>
      </section>

      <section>
        <SectionLabel>Customers</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Customers" value={kpis.customerCount} tone="brand" />
          <StatTile label="Customers at risk" value={kpis.customersAtRisk} tone="amber" />
          <StatTile label="Customers churned" value={kpis.customersChurned} tone="red" />
        </div>
      </section>

      <AccountsByPhaseChart data={kpis.accountsByPhase} />

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-medium text-slate-900 dark:text-slate-100">Recent activity</h2>
        {kpis.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {kpis.recentActivity.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{entry.message}</span>
                <span className="shrink-0 text-slate-400 dark:text-slate-500">{entry.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
