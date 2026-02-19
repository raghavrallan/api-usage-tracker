import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { UsageTrendPoint } from "@/types";
import { formatDate, formatNumber } from "@/utils/formatters";

export default function UsageTrendChart({ data }: { data: UsageTrendPoint[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Usage Trend</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis yAxisId="left" tickFormatter={formatNumber} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <Tooltip
            formatter={(value: any, name: any) =>
              name === "cost" ? [`$${Number(value).toFixed(4)}`, "Cost"] : [formatNumber(Number(value)), name === "tokens" ? "Tokens" : "Requests"]
            }
            labelFormatter={(label: any) => formatDate(String(label))}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} name="Tokens" />
          <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#22c55e" strokeWidth={2} dot={false} name="Cost ($)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
