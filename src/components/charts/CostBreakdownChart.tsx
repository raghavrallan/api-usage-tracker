"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, platformLabel } from "@/lib/formatters";

interface Props {
  data: { platform: string; cost: number }[];
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function CostBreakdownChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.cost, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cost Breakdown</CardTitle>
        <CardDescription className="text-xs">Spending by platform &middot; {formatCurrency(total)} total</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="cost"
              nameKey="platform"
              label={((props: { name?: string; value?: number; percent?: number }) => `${platformLabel(props.name || "")} ${((props.percent || 0) * 100).toFixed(0)}%`) as never}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={((value: number) => formatCurrency(value)) as never}
              labelFormatter={(label: string) => platformLabel(label)}
            />
            <Legend formatter={(value: string) => platformLabel(value)} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
