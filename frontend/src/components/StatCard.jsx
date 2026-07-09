// Small metric tile for the top of dashboards. `tone` picks an accent color.
const TONES = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  teal: "bg-teal-100 text-teal-600",
  red: "bg-red-100 text-red-600",
};

export default function StatCard({ icon: Icon, label, value, tone = "slate" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-xl p-2.5 ${TONES[tone] || TONES.slate}`}>
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-slate-800">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}
