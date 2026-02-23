"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  description?: string;
}

export function KPICard({ title, value, change, icon, description }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                change > 0 && "text-emerald-600 dark:text-emerald-400",
                change < 0 && "text-red-600 dark:text-red-400",
                change === 0 && "text-muted-foreground",
              )}>
                {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {change > 0 ? "+" : ""}{change}%
              </div>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
