import { requireModule } from "@/lib/authz/dal";
import { getDashboardKpis } from "@/lib/kpi/compute";
import { StatTile } from "@/components/dashboard/StatTile";
import { AccountsByPhaseChart } from "@/components/dashboard/AccountsByPhaseChart";
import { ExportButtons } from "@/components/dashboard/ExportButtons";

export default async function DashboardPage() {
  const session = await requireModule("dashboard");
  const kpis = await getDashboardKpis();
  const pctLabel = (v: number | null) => (v === null ? "—" : `${v}%`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        {session.user.access && <ExportButtons />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Prospects" value={kpis.prospectCount} />
        <StatTile label="Partners" value={kpis.partnerCount} />
        <StatTile label="Qualified conversion rate" value={pctLabel(kpis.qualifiedConversionRate)} />
        <StatTile label="NDA completion rate" value={pctLabel(kpis.ndaCompletionRate)} />
        <StatTile label="Training completion rate" value={pctLabel(kpis.trainingCompletionRate)} />
        <StatTile label="Active & engaged partners (phase 9)" value={kpis.activeEngagedPartnersAtPhase9} />
        <StatTile label="Long-term retention" value={pctLabel(kpis.longTermRetention)} />
        <StatTile
          label="Avg. partner satisfaction"
          value={kpis.avgPartnerSatisfaction ? kpis.avgPartnerSatisfaction.toFixed(1) : "—"}
        />
        <StatTile label="Partner-generated opportunities" value={kpis.totalPartnerGeneratedOpportunities} />
        <StatTile label="Customers" value={kpis.customerCount} />
        <StatTile label="Customers at risk" value={kpis.customersAtRisk} />
        <StatTile label="Customers churned" value={kpis.customersChurned} />
      </div>

      <AccountsByPhaseChart data={kpis.accountsByPhase} />

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">Recent activity</h2>
        {kpis.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {kpis.recentActivity.map((entry) => (
              <li key={entry.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{entry.message}</span>
                <span className="shrink-0 text-slate-400">{entry.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
