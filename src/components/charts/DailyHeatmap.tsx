"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/formatters";

interface Props {
  data: { date: string; value: number }[];
  title?: string;
  description?: string;
}

function getIntensity(value: number, max: number): string {
  if (max === 0) return "bg-muted";
  const ratio = value / max;
  if (ratio === 0) return "bg-muted";
  if (ratio < 0.25) return "bg-chart-1/20";
  if (ratio < 0.5) return "bg-chart-1/40";
  if (ratio < 0.75) return "bg-chart-1/60";
  return "bg-chart-1/90";
}

export function DailyHeatmap({ data, title = "Daily Activity", description = "Request volume heatmap" }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const weeks: { date: string; value: number }[][] = [];
  let currentWeek: { date: string; value: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    const dayOfWeek = new Date(data[i].date).getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(data[i]);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex gap-1">
            <div className="flex flex-col gap-1 mr-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="h-4 flex items-center text-[10px] text-muted-foreground">
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, di) => {
                    const day = week.find((d) => new Date(d.date).getDay() === di);
                    if (!day) return <div key={di} className="h-4 w-4" />;
                    return (
                      <Tooltip key={di}>
                        <TooltipTrigger asChild>
                          <div className={`h-4 w-4 rounded-sm ${getIntensity(day.value, max)} cursor-default transition-colors`} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-medium">{day.date}</p>
                          <p className="text-xs text-muted-foreground">{formatNumber(day.value)} requests</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="h-3 w-3 rounded-sm bg-muted" />
            <div className="h-3 w-3 rounded-sm bg-chart-1/20" />
            <div className="h-3 w-3 rounded-sm bg-chart-1/40" />
            <div className="h-3 w-3 rounded-sm bg-chart-1/60" />
            <div className="h-3 w-3 rounded-sm bg-chart-1/90" />
            <span>More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
