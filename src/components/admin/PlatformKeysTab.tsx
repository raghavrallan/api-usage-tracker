"use client";

import { useEffect, useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/DataTable";
import { SortableHeader } from "@/components/common/SortableHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { platformLabel, platformColor, formatDateTime } from "@/lib/formatters";

interface PlatformKey {
  id: string;
  platform: string;
  keyLabel: string;
  redactedValue: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  project: { id: string; name: string };
}

interface Project { id: string; name: string }

export function PlatformKeysTab() {
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformKey | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "openai", keyLabel: "", key: "", projectId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, pRes] = await Promise.all([fetch("/api/admin/platform-keys"), fetch("/api/admin/projects")]);
      if (kRes.ok) setKeys(await kRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/platform-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast.success("API key added"); setDialogOpen(false); fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Failed"); }
    } catch { toast.error("Network error"); }
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyId: id }) });
      if (res.ok) { toast.success("Sync completed"); fetchData(); } else toast.error("Sync failed");
    } catch { toast.error("Network error"); }
    setSyncing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/platform-keys?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Key deleted"); fetchData(); } else toast.error("Failed to delete");
    } catch { toast.error("Network error"); }
    setDeleteTarget(null);
  }

  const columns: ColumnDef<PlatformKey>[] = [
    { accessorKey: "keyLabel", header: ({ column }) => <SortableHeader column={column} title="Label" />, cell: ({ row }) => <span className="font-medium">{row.getValue("keyLabel")}</span> },
    {
      accessorKey: "platform", header: "Platform",
      cell: ({ row }) => {
        const p = row.getValue("platform") as string;
        return <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: platformColor(p) }} /><span className="text-sm">{platformLabel(p)}</span></div>;
      },
    },
    { id: "project", header: "Project", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.project.name}</span> },
    { accessorKey: "redactedValue", header: "Key", cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.getValue("redactedValue") || "—"}</code> },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>{row.getValue("isActive") ? "Active" : "Inactive"}</Badge> },
    { accessorKey: "lastSyncedAt", header: "Last Sync", cell: ({ row }) => { const v = row.getValue("lastSyncedAt") as string | null; return <span className="text-xs text-muted-foreground">{v ? formatDateTime(v) : "Never"}</span>; } },
    {
      id: "actions", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSync(row.original.id)} disabled={syncing === row.original.id}>
              {syncing === row.original.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Sync Now
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <DataTable columns={columns} data={keys} loading={loading} searchKey="keyLabel" searchPlaceholder="Search API keys..."
        toolbar={<Button size="sm" onClick={() => { setForm({ platform: "openai", keyLabel: "", key: "", projectId: "" }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add API Key</Button>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add API Key</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic</SelectItem><SelectItem value="google">Google</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Label</Label><Input value={form.keyLabel} onChange={(e) => setForm({ ...form, keyLabel: e.target.value })} placeholder="e.g. Production Key" /></div>
            <div className="grid gap-2"><Label>API Key</Label><Input type="password" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sk-..." /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate}>Add Key</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete API Key</AlertDialogTitle><AlertDialogDescription>Delete &quot;{deleteTarget?.keyLabel}&quot;? All usage data for this key will also be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
