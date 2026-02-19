import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TopProjectItem } from "@/types";
import { formatCurrency } from "@/utils/formatters";

export default function TopProjectsChart({ data }: { data: TopProjectItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Top Projects by Spend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis type="category" dataKey="project_name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
          <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
          <Bar dataKey="total_cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Cost" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
