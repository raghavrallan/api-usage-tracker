import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ModelDistributionItem } from "@/types";
import { formatNumber } from "@/utils/formatters";

export default function ModelDistributionChart({ data }: { data: ModelDistributionItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Usage by Model</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={formatNumber} tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis type="category" dataKey="model" tick={{ fontSize: 11 }} stroke="#94a3b8" width={80} />
          <Tooltip formatter={(value: any) => formatNumber(Number(value))} />
          <Bar dataKey="tokens" fill="#6366f1" radius={[0, 4, 4, 0]} name="Tokens" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
