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
import { Plus, MoreHorizontal, Trash2, Search, Loader2 } from "lucide-react";
import { platformLabel } from "@/lib/formatters";

interface AdminKey {
  id: string;
  platform: string;
  keyLabel: string;
  keyType: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  _count?: { discoveredKeys: number };
}

export function AdminKeysTab() {
  const [keys, setKeys] = useState<AdminKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminKey | null>(null);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "openai", keyLabel: "", key: "", keyType: "admin" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/admin/admin-keys"); if (res.ok) setKeys(await res.json()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/admin-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast.success("Admin key added"); setDialogOpen(false); fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Failed"); }
    } catch { toast.error("Network error"); }
  }

  async function handleDiscover(id: string) {
    setDiscovering(id);
    try {
      const res = await fetch("/api/admin/admin-keys/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminKeyId: id }) });
      if (res.ok) { const data = await res.json(); toast.success(`Discovered ${data.discovered || 0} keys`); fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Discovery failed"); }
    } catch { toast.error("Network error"); }
    setDiscovering(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/admin-keys?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Admin key deleted"); fetchData(); } else toast.error("Failed to delete");
    } catch { toast.error("Network error"); }
    setDeleteTarget(null);
  }

  const columns: ColumnDef<AdminKey>[] = [
    { accessorKey: "keyLabel", header: ({ column }) => <SortableHeader column={column} title="Label" />, cell: ({ row }) => <span className="font-medium">{row.getValue("keyLabel")}</span> },
    { accessorKey: "platform", header: "Platform", cell: ({ row }) => <Badge variant="secondary">{platformLabel(row.getValue("platform"))}</Badge> },
    { accessorKey: "keyType", header: "Type", cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.getValue("keyType") as string}</Badge> },
    { id: "discovered", header: "Discovered Keys", cell: ({ row }) => <span className="text-sm">{row.original._count?.discoveredKeys ?? 0}</span> },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>{row.getValue("isActive") ? "Active" : "Inactive"}</Badge> },
    {
      id: "actions", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDiscover(row.original.id)} disabled={discovering === row.original.id}>
              {discovering === row.original.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Discover Keys
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <DataTable columns={columns} data={keys} loading={loading} searchKey="keyLabel" searchPlaceholder="Search admin keys..."
        toolbar={<Button size="sm" onClick={() => { setForm({ platform: "openai", keyLabel: "", key: "", keyType: "admin" }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Admin Key</Button>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Admin Key</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic</SelectItem><SelectItem value="google">Google</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Label</Label><Input value={form.keyLabel} onChange={(e) => setForm({ ...form, keyLabel: e.target.value })} placeholder="e.g. Production Admin Key" /></div>
            <div className="grid gap-2"><Label>API Key</Label><Input type="password" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sk-admin-..." /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate}>Add Key</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Admin Key</AlertDialogTitle><AlertDialogDescription>Delete &quot;{deleteTarget?.keyLabel}&quot;? Discovered keys will remain but lose their admin key link.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
