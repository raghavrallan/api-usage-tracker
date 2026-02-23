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
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Project { id: string; name: string; description: string | null; department?: { id: string; name: string } | null; departmentId?: string | null; _count?: { platformKeys: number } }
interface Dept { id: string; name: string }

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", departmentId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([fetch("/api/admin/projects"), fetch("/api/admin/departments")]);
      if (pRes.ok) setProjects(await pRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() { setEditing(null); setForm({ name: "", description: "", departmentId: "" }); setDialogOpen(true); }
  function openEdit(p: Project) { setEditing(p); setForm({ name: p.name, description: p.description || "", departmentId: p.departmentId || "" }); setDialogOpen(true); }

  async function handleSubmit() {
    try {
      const url = editing ? `/api/admin/projects/${editing.id}` : "/api/admin/projects";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, string> = { name: form.name, description: form.description };
      if (form.departmentId) body.departmentId = form.departmentId;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { toast.success(editing ? "Project updated" : "Project created"); setDialogOpen(false); fetchData(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Failed"); }
    } catch { toast.error("Network error"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/projects/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Project deleted"); fetchData(); } else toast.error("Failed to delete");
    } catch { toast.error("Network error"); }
    setDeleteTarget(null);
  }

  const columns: ColumnDef<Project>[] = [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Name" />, cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span> },
    { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{row.getValue("description") || "—"}</span> },
    { id: "department", header: "Department", cell: ({ row }) => <span className="text-sm">{(row.original.department as Dept | null)?.name || "—"}</span> },
    { id: "keys", header: "Keys", cell: ({ row }) => <Badge variant="secondary">{row.original._count?.platformKeys ?? 0}</Badge> },
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
      <DataTable columns={columns} data={projects} loading={loading} searchKey="name" searchPlaceholder="Search projects..." toolbar={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Project</Button>} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Create Project"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Project</AlertDialogTitle><AlertDialogDescription>Delete &quot;{deleteTarget?.name}&quot;? All associated keys and usage data will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
