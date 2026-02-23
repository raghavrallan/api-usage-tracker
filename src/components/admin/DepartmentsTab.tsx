"use client";

import { useEffect, useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/common/DataTable";
import { SortableHeader } from "@/components/common/SortableHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Dept { id: string; name: string; description: string | null; _count?: { projects: number; users: number } }

export function DepartmentsTab() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dept | null>(null);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/admin/departments"); if (res.ok) setDepts(await res.json()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); }
  function openEdit(d: Dept) { setEditing(d); setForm({ name: d.name, description: d.description || "" }); setDialogOpen(true); }

  async function handleSubmit() {
    try {
      const url = editing ? `/api/admin/departments/${editing.id}` : "/api/admin/departments";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast.success(editing ? "Department updated" : "Department created"); setDialogOpen(false); fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Failed"); }
    } catch { toast.error("Network error"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/departments/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Department deleted"); fetchData(); } else toast.error("Failed to delete");
    } catch { toast.error("Network error"); }
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Dept>[] = [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Name" />, cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span> },
    { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("description") || "—"}</span> },
    { id: "projects", header: "Projects", cell: ({ row }) => <span className="text-sm">{row.original._count?.projects ?? 0}</span> },
    { id: "users", header: "Users", cell: ({ row }) => <span className="text-sm">{row.original._count?.users ?? 0}</span> },
    {
      id: "actions", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <DataTable columns={columns} data={depts} loading={loading} searchKey="name" searchPlaceholder="Search departments..." toolbar={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Department</Button>} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Department" : "Create Department"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Department</AlertDialogTitle><AlertDialogDescription>Delete &quot;{deleteTarget?.name}&quot;? This will also remove associated projects.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
