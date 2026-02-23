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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department?: { id: string; name: string } | null;
  departmentId?: string | null;
  createdAt: string;
}

interface Dept { id: string; name: string }

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", fullName: "", password: "", role: "user", departmentId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/departments")]);
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ email: "", fullName: "", password: "", role: "user", departmentId: "" });
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({ email: user.email, fullName: user.fullName, password: "", role: user.role, departmentId: user.departmentId || "" });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, string> = { email: form.email, fullName: form.fullName, role: form.role };
      if (form.departmentId) body.departmentId = form.departmentId;
      if (form.password) body.password = form.password;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(editing ? "User updated" : "User created");
        setDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save user");
      }
    } catch { toast.error("Network error"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("User deleted"); fetchData(); }
      else toast.error("Failed to delete user");
    } catch { toast.error("Network error"); }
    setDeleteTarget(null);
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "fullName", header: ({ column }) => <SortableHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{row.original.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback></Avatar>
          <div><p className="font-medium text-sm">{row.original.fullName}</p><p className="text-xs text-muted-foreground">{row.original.email}</p></div>
        </div>
      ),
    },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <Badge variant={row.getValue("role") === "admin" ? "default" : "secondary"} className="capitalize">{row.getValue("role") as string}</Badge> },
    { accessorKey: "department", header: "Department", cell: ({ row }) => <span className="text-sm text-muted-foreground">{(row.original.department as Dept | null)?.name || "—"}</span> },
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
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchKey="fullName"
        searchPlaceholder="Search users..."
        toolbar={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add User</Button>}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Password {editing && "(leave blank to keep)"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>{editing ? "Save Changes" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {deleteTarget?.fullName}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
