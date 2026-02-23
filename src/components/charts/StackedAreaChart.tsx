"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber, platformLabel } from "@/lib/formatters";

interface Props {
  data: Record<string, unknown>[];
  platforms: string[];
  title?: string;
  description?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  openai: "var(--chart-1)",
  anthropic: "var(--chart-3)",
  google: "var(--chart-2)",
};

export function StackedAreaChart({
  data,
  platforms,
  title = "Token Usage by Platform",
  description = "Daily token consumption stacked by provider",
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} width={60} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={((value: number, name: string) => [formatNumber(value), platformLabel(name)]) as never}
              labelFormatter={(label: string) => label}
            />
            <Legend formatter={(value: string) => platformLabel(value)} iconType="circle" />
            {platforms.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stackId="1"
                stroke={PLATFORM_COLORS[p] || "var(--chart-5)"}
                fill={PLATFORM_COLORS[p] || "var(--chart-5)"}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
