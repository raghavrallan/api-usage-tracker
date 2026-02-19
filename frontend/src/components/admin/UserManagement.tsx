import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { fetchUsers, createUser, updateUser, deleteUser, fetchDepartments } from "@/api/admin";
import type { User, Department } from "@/types";

export default function UserManagement() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "user", department_id: "" });

  const users = useQuery({ queryKey: ["adminUsers"], queryFn: fetchUsers });
  const depts = useQuery({ queryKey: ["adminDepts"], queryFn: fetchDepartments });

  const createMut = useMutation({
    mutationFn: () => createUser({ email: form.email, password: form.password, full_name: form.full_name, role: form.role, department_id: form.department_id || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminUsers"] }); resetForm(); },
  });
  const updateMut = useMutation({
    mutationFn: () => updateUser(editing!.id, { full_name: form.full_name, role: form.role, department_id: form.department_id || undefined, is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminUsers"] }); resetForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm({ email: "", password: "", full_name: "", role: "user", department_id: "" }); };
  const startEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, password: "", full_name: u.full_name, role: u.role, department_id: u.department_id || "" });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Users</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {showForm && (
        <Modal title={editing ? "Edit User" : "Add User"} onClose={resetForm}>
          <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }} className="space-y-4">
            <Input label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            {!editing && (
              <>
                <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                <option value="">None</option>
                {depts.data?.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-medium text-slate-500">Name</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Email</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Role</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
          </tr></thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">{u.full_name}</td>
                <td className="py-3 px-4 text-slate-600">{u.email}</td>
                <td className="py-3 px-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-700"}`}>{u.role}</span></td>
                <td className="py-3 px-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => startEdit(u)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this user?")) deleteMut.mutate(u.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
    </div>
  );
}
