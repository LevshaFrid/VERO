import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { dashboardData } from "@/src/data";
import { MetricCard } from "./MetricCard";

export function Dashboard() {
  const { metrics, quarterlyData } = dashboardData;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title={metrics.arr.label}
          value={metrics.arr.value}
          trend={metrics.arr.trend}
          isPositive={metrics.arr.isPositive}
        />
        <MetricCard
          title={metrics.revenue.label}
          value={metrics.revenue.value}
          trend={metrics.revenue.trend}
          isPositive={metrics.revenue.isPositive}
        />
        <MetricCard
          title={metrics.q4Performance.label}
          value={metrics.q4Performance.value}
          trend={metrics.q4Performance.trend}
          isPositive={metrics.q4Performance.isPositive}
        />
        <MetricCard
          title={metrics.churn.label}
          value={metrics.churn.value}
          trend={metrics.churn.trend}
          isPositive={metrics.churn.isPositive}
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            2024 Quarterly Performance vs Forecast
          </h2>
          <p className="text-sm text-slate-500">
            Actual revenue compared to forecasted targets (in Millions USD).
          </p>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={quarterlyData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="quarter"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => `$${value}M`}
                dx={-10}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`$${value}M`, ""]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ paddingTop: "20px" }}
              />
              <Bar
                dataKey="actual"
                name="Actual Revenue"
                fill="#0f172a"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar
                dataKey="forecast"
                name="Forecasted Revenue"
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
