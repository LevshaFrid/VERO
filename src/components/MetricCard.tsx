import { cn } from "@/src/lib/utils";

export function MetricCard({
  title,
  value,
  trend,
  isPositive,
}: {
  title: string;
  value: string;
  trend: string;
  isPositive: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      <div
        className={cn(
          "text-sm font-medium",
          isPositive ? "text-emerald-600" : "text-rose-600"
        )}
      >
        {trend}
      </div>
    </div>
  );
}
