"use client";

import { useEffect, useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/DataTable";
import { SortableHeader } from "@/components/common/SortableHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2 } from "lucide-react";
import { platformLabel, formatDateTime } from "@/lib/formatters";

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  recordsSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  platformKey: { keyLabel: string; platform: string };
}

export function SyncLogsTab() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/sync"); if (res.ok) setLogs(await res.json()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  async function handleSyncAll() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) { toast.success("Full sync completed"); fetchData(); } else toast.error("Sync failed");
    } catch { toast.error("Network error"); }
    setSyncing(false);
  }

  const columns: ColumnDef<SyncLog>[] = [
    {
      accessorKey: "startedAt",
      header: ({ column }) => <SortableHeader column={column} title="Time" />,
      cell: ({ row }) => <span className="text-sm">{formatDateTime(row.getValue("startedAt"))}</span>,
    },
    {
      id: "key",
      header: "Key",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.platformKey.keyLabel}</p>
          <p className="text-xs text-muted-foreground">{platformLabel(row.original.platformKey.platform)}</p>
        </div>
      ),
    },
    { accessorKey: "syncType", header: "Type", cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.getValue("syncType") as string}</Badge> },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge variant={status === "success" ? "default" : status === "failed" ? "destructive" : "secondary"}>{status}</Badge>;
      },
    },
    { accessorKey: "recordsSynced", header: ({ column }) => <SortableHeader column={column} title="Records" className="justify-end" />, cell: ({ row }) => <div className="text-right text-sm">{row.getValue("recordsSynced")}</div> },
    {
      id: "duration", header: "Duration",
      cell: ({ row }) => {
        const start = new Date(row.original.startedAt).getTime();
        const end = row.original.completedAt ? new Date(row.original.completedAt).getTime() : Date.now();
        const ms = end - start;
        return <span className="text-xs text-muted-foreground">{ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}</span>;
      },
    },
    {
      id: "error", header: "Error",
      cell: ({ row }) => row.original.errorMessage ? <span className="text-xs text-destructive truncate max-w-[150px] block">{row.original.errorMessage}</span> : null,
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        searchKey="syncType"
        searchPlaceholder="Filter by type..."
        toolbar={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
            </div>
            <Button size="sm" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync All
            </Button>
          </div>
        }
      />
    </div>
  );
}
