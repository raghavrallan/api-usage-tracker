import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CostBreakdownItem } from "@/types";
import { platformColor, platformLabel, formatCurrency } from "@/utils/formatters";

export default function CostBreakdownChart({ data }: { data: CostBreakdownItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Cost by Provider</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="cost"
            nameKey="platform"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            label={(props: any) => `${platformLabel(props.platform)} ${props.percentage}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.platform} fill={platformColor(entry.platform)} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
          <Legend formatter={(value: string) => platformLabel(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
