"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { KPICard } from "@/components/common/KPICard";
import { UsageTrendChart } from "@/components/charts/UsageTrendChart";
import { CostBreakdownChart } from "@/components/charts/CostBreakdownChart";
import { ModelDistributionChart } from "@/components/charts/ModelDistributionChart";
import { TopProjectsChart } from "@/components/charts/TopProjectsChart";
import { StackedAreaChart } from "@/components/charts/StackedAreaChart";
import { DailyHeatmap } from "@/components/charts/DailyHeatmap";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Hash, Key, FolderOpen, RefreshCw, Loader2, Zap } from "lucide-react";
import { formatNumber, formatCurrency, formatDateTime, platformLabel } from "@/lib/formatters";

interface DashboardData {
  kpi: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    activeKeys: number;
    activeProjects: number;
    tokenChange: number;
    costChange: number;
  };
  usageTrends: { date: string; tokens: number; cost: number }[];
  platformStacked: Record<string, unknown>[];
  platforms: string[];
  costBreakdown: { platform: string; cost: number }[];
  modelDistribution: { model: string; tokens: number }[];
  topProjects: { name: string; cost: number; tokens: number }[];
  heatmap: { date: string; value: number }[];
  recentSyncs: {
    id: string;
    keyLabel: string;
    platform: string;
    status: string;
    syncType: string;
    recordsSynced: number;
    startedAt: string;
    completedAt: string | null;
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState("30");
  const [platform, setPlatform] = useState("all");

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/dashboard?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load dashboard data");
      }
    } catch {
      toast.error("Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, [range, platform]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) {
        toast.success("Sync completed successfully");
        await fetchData();
      } else {
        toast.error("Sync failed");
      }
    } catch {
      toast.error("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[400px]" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[350px]" /><Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your API usage and costs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Tokens"
          value={formatNumber(data.kpi.totalTokens)}
          change={data.kpi.tokenChange}
          icon={<Hash className="h-4 w-4" />}
          description="vs previous period"
        />
        <KPICard
          title="Total Cost"
          value={formatCurrency(data.kpi.totalCost)}
          change={data.kpi.costChange}
          icon={<Coins className="h-4 w-4" />}
          description="vs previous period"
        />
        <KPICard
          title="Active Keys"
          value={data.kpi.activeKeys.toString()}
          icon={<Key className="h-4 w-4" />}
          description={`${formatNumber(data.kpi.totalRequests)} requests`}
        />
        <KPICard
          title="Active Projects"
          value={data.kpi.activeProjects.toString()}
          icon={<FolderOpen className="h-4 w-4" />}
          description={`${data.kpi.activeKeys} keys across projects`}
        />
      </div>

      {/* Primary chart: stacked area by platform */}
      {data.platformStacked.length > 0 && (
        <StackedAreaChart
          data={data.platformStacked}
          platforms={data.platforms}
        />
      )}

      {/* Secondary charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CostBreakdownChart data={data.costBreakdown} />
        <ModelDistributionChart data={data.modelDistribution} />
      </div>

      {/* Third row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProjectsChart data={data.topProjects} />
        <DailyHeatmap data={data.heatmap} />
      </div>

      {/* Usage trend */}
      <UsageTrendChart data={data.usageTrends} />

      {/* Recent syncs */}
      {data.recentSyncs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Recent Sync Activity
            </CardTitle>
            <CardDescription className="text-xs">Last 5 sync operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSyncs.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell className="font-medium text-sm">{sync.keyLabel}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{platformLabel(sync.platform)}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{sync.syncType}</TableCell>
                    <TableCell>
                      <Badge variant={sync.status === "success" ? "default" : sync.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                        {sync.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{sync.recordsSynced}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatDateTime(sync.startedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
