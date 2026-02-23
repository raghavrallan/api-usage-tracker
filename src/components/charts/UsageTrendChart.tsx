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
import { formatNumber, formatCurrency } from "@/lib/formatters";

interface Props {
  data: { date: string; tokens: number; cost: number }[];
  title?: string;
  description?: string;
}

export function UsageTrendChart({ data, title = "Usage Trend", description = "Token usage and cost over time" }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} className="text-muted-foreground" />
            <YAxis yAxisId="tokens" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} width={60} />
            <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} width={50} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={((value: number, name: string) =>
                name === "Tokens" ? [formatNumber(value), "Tokens"] : [formatCurrency(value), "Cost"]
              ) as never}
              labelFormatter={(label: string) => label}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area yAxisId="tokens" type="monotone" dataKey="tokens" stroke="var(--chart-1)" fill="url(#tokenGrad)" strokeWidth={2} name="Tokens" />
            <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="var(--chart-2)" fill="url(#costGrad)" strokeWidth={2} name="Cost" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
