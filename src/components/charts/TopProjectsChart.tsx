"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface Props {
  data: { name: string; cost: number; tokens: number }[];
}

export function TopProjectsChart({ data }: Props) {
  const maxCost = Math.max(...data.map((d) => d.cost), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Projects</CardTitle>
        <CardDescription className="text-xs">Ranked by cost</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, i) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs w-4">{i + 1}</span>
                  <span className="font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatNumber(item.tokens)} tokens</span>
                  <span className="font-medium text-foreground">{formatCurrency(item.cost)}</span>
                </div>
              </div>
              <Progress value={(item.cost / maxCost) * 100} className="h-1.5" />
            </div>
          ))}
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No project data</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
