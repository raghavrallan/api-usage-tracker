"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber } from "@/lib/formatters";

interface Props {
  data: { model: string; tokens: number }[];
}

export function ModelDistributionChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.tokens - a.tokens);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Model Distribution</CardTitle>
        <CardDescription className="text-xs">Token usage by model</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} />
            <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={140} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={((value: number) => [formatNumber(value), "Tokens"]) as never}
            />
            <Bar dataKey="tokens" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
