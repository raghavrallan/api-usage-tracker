"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/common/DataTable";
import { SortableHeader } from "@/components/common/SortableHeader";
import { UsageTrendChart } from "@/components/charts/UsageTrendChart";
import { Download, Loader2 } from "lucide-react";
import { formatNumber, formatCurrency, platformLabel, platformColor } from "@/lib/formatters";

type ViewTab = "project" | "key" | "department" | "users";

interface ListItem {
  id: string;
  name?: string;
  keyLabel?: string;
  platform?: string;
  department?: string;
  project?: string;
  keys?: number;
  totalTokens: number;
  totalCost: number;
  redactedValue?: string;
  inputTokens?: number;
  outputTokens?: number;
  records?: number;
}

interface DetailData {
  project?: { id: string; name: string; department?: string };
  key?: { id: string; keyLabel: string; platform: string; project: string; redactedValue?: string };
  department?: { id: string; name: string };
  keys?: { id: string; keyLabel: string; platform: string; isActive: boolean }[];
  trends?: { date: string; tokens: number; cost: number }[];
  modelBreakdown?: { model: string; tokens: number; cost: number; requests?: number; inputTokens?: number; outputTokens?: number }[];
  projects?: { id: string; name: string; tokens: number; cost: number }[];
}

const projectColumns: ColumnDef<ListItem>[] = [
  { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Project" />, cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span> },
  { accessorKey: "department", header: "Department", cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("department") || "—"}</span> },
  { accessorKey: "keys", header: "Keys", cell: ({ row }) => <Badge variant="secondary">{row.getValue("keys")}</Badge> },
  { accessorKey: "totalTokens", header: ({ column }) => <SortableHeader column={column} title="Total Tokens" className="justify-end" />, cell: ({ row }) => <div className="text-right font-mono text-sm">{formatNumber(row.getValue("totalTokens"))}</div> },
  { accessorKey: "totalCost", header: ({ column }) => <SortableHeader column={column} title="Total Cost" className="justify-end" />, cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue("totalCost"))}</div> },
];

const keyColumns: ColumnDef<ListItem>[] = [
  { accessorKey: "keyLabel", header: ({ column }) => <SortableHeader column={column} title="Key Label" />, cell: ({ row }) => <span className="font-medium">{row.getValue("keyLabel")}</span> },
  { accessorKey: "platform", header: "Platform", cell: ({ row }) => { const p = row.getValue("platform") as string; return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: platformColor(p) }} /><span className="text-sm">{platformLabel(p)}</span></div>; } },
  { accessorKey: "project", header: "Project", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("project")}</span> },
  { accessorKey: "redactedValue", header: "Key", cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.getValue("redactedValue")}</code> },
  { accessorKey: "inputTokens", header: ({ column }) => <SortableHeader column={column} title="Input" className="justify-end" />, cell: ({ row }) => <div className="text-right font-mono text-sm">{formatNumber(row.getValue("inputTokens") as number || 0)}</div> },
  { accessorKey: "outputTokens", header: ({ column }) => <SortableHeader column={column} title="Output" className="justify-end" />, cell: ({ row }) => <div className="text-right font-mono text-sm">{formatNumber(row.getValue("outputTokens") as number || 0)}</div> },
  { accessorKey: "totalCost", header: ({ column }) => <SortableHeader column={column} title="Cost" className="justify-end" />, cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue("totalCost"))}</div> },
];

const departmentColumns: ColumnDef<ListItem>[] = [
  { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Department" />, cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span> },
  { accessorKey: "keys", header: "Keys", cell: ({ row }) => <Badge variant="secondary">{row.getValue("keys")}</Badge> },
  { accessorKey: "totalTokens", header: ({ column }) => <SortableHeader column={column} title="Tokens" className="justify-end" />, cell: ({ row }) => <div className="text-right font-mono text-sm">{formatNumber(row.getValue("totalTokens"))}</div> },
  { accessorKey: "totalCost", header: ({ column }) => <SortableHeader column={column} title="Cost" className="justify-end" />, cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue("totalCost"))}</div> },
];

const userColumns: ColumnDef<ListItem>[] = [
  { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="User" />, cell: ({ row }) => <span className="font-medium font-mono text-sm">{row.getValue("name")}</span> },
  { accessorKey: "totalTokens", header: ({ column }) => <SortableHeader column={column} title="Tokens" className="justify-end" />, cell: ({ row }) => <div className="text-right font-mono text-sm">{formatNumber(row.getValue("totalTokens"))}</div> },
  { accessorKey: "totalCost", header: ({ column }) => <SortableHeader column={column} title="Cost" className="justify-end" />, cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue("totalCost"))}</div> },
];

const tabColumnMap: Record<ViewTab, ColumnDef<ListItem>[]> = {
  project: projectColumns,
  key: keyColumns,
  department: departmentColumns,
  users: userColumns,
};

const tabSearchKey: Record<ViewTab, string> = {
  project: "name",
  key: "keyLabel",
  department: "name",
  users: "name",
};

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<ViewTab>("project");
  const [listData, setListData] = useState<ListItem[]>([]);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [platform, setPlatform] = useState("all");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setDetailData(null);
    setDetailOpen(false);
    try {
      const params = new URLSearchParams({ view: tab, range });
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) setListData(await res.json());
      else toast.error("Failed to load analytics data");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [tab, range, platform]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const params = new URLSearchParams({ view: tab, id, range });
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) {
        setDetailData(await res.json());
        setDetailOpen(true);
      }
    } catch {
      toast.error("Failed to load details");
    }
  }, [tab, range, platform]);

  useEffect(() => {
    if (session) fetchList();
  }, [session, fetchList]);

  function handleRowClick(item: ListItem) {
    if (tab !== "users") fetchDetail(item.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed usage analytics and drill-down views</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/analytics/export?range=${range}`, "_blank")}>
            <Download className="h-4 w-4 mr-1" />Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)}>
        <TabsList>
          <TabsTrigger value="project">By Project</TabsTrigger>
          <TabsTrigger value="key">By Key</TabsTrigger>
          <TabsTrigger value="department">By Department</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <DataTable
              columns={tabColumnMap[tab].map((col) => ({
                ...col,
                cell: (props) => {
                  const originalCell = typeof col.cell === "function" ? col.cell(props) : props.getValue();
                  if (tab === "users") return originalCell;
                  return (
                    <div className="cursor-pointer" onClick={() => handleRowClick(props.row.original)}>
                      {originalCell as React.ReactNode}
                    </div>
                  );
                },
              })) as ColumnDef<ListItem>[]}
              data={listData}
              searchKey={tabSearchKey[tab]}
              searchPlaceholder={`Search ${tab}...`}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailData ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {detailData.project?.name || detailData.key?.keyLabel || detailData.department?.name}
                </SheetTitle>
                <SheetDescription>
                  {detailData.project?.department && `Department: ${detailData.project.department}`}
                  {detailData.key?.platform && `${platformLabel(detailData.key.platform)} · ${detailData.key.project}`}
                  {detailData.department && "Department breakdown"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {detailData.keys && (
                  <div className="flex gap-2 flex-wrap">
                    {detailData.keys.map((k) => (
                      <Badge key={k.id} variant={k.isActive ? "default" : "secondary"}>
                        {platformLabel(k.platform)}: {k.keyLabel}
                      </Badge>
                    ))}
                  </div>
                )}

                {detailData.trends && detailData.trends.length > 0 && (
                  <UsageTrendChart data={detailData.trends} title="Usage Over Time" description="Trend for selected item" />
                )}

                {detailData.modelBreakdown && detailData.modelBreakdown.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Model Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {detailData.modelBreakdown.map((m) => (
                          <div key={m.model} className="flex items-center justify-between text-sm">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.model}</code>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatNumber(m.tokens)} tokens</span>
                              <span className="font-medium text-foreground">{formatCurrency(m.cost)}</span>
                              {m.requests !== undefined && <span>{formatNumber(m.requests)} req</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {detailData.projects && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Projects</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detailData.projects.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-2 rounded border text-sm">
                            <span className="font-medium">{p.name}</span>
                            <div className="flex gap-4 text-xs">
                              <span className="text-muted-foreground">{formatNumber(p.tokens)} tokens</span>
                              <span className="font-medium">{formatCurrency(p.cost)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
