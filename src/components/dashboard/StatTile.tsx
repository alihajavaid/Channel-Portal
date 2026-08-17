type Tone = "brand" | "emerald" | "amber" | "red";

const TONE_BAR: Record<Tone, string> = {
  brand: "bg-brand",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function StatTile({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`h-1 ${TONE_BAR[tone]}`} />
      <div className="p-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  );
}
