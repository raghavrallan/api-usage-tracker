import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { fetchProjects, createProject, updateProject, deleteProject, fetchDepartments } from "@/api/admin";
import type { Project, Department } from "@/types";

export default function ProjectManagement() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", department_id: "" });

  const projects = useQuery({ queryKey: ["adminProjects"], queryFn: fetchProjects });
  const depts = useQuery({ queryKey: ["adminDepts"], queryFn: fetchDepartments });

  const createMut = useMutation({
    mutationFn: () => createProject({ ...form, department_id: form.department_id || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminProjects"] }); resetForm(); },
  });
  const updateMut = useMutation({
    mutationFn: () => updateProject(editing!.id, { name: form.name, description: form.description, department_id: form.department_id || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminProjects"] }); resetForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminProjects"] }),
  });

  const resetForm = () => { setShowForm(false); setEditing(null); setForm({ name: "", description: "", department_id: "" }); };
  const startEdit = (p: Project) => { setEditing(p); setForm({ name: p.name, description: p.description || "", department_id: p.department_id || "" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Projects</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Project
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editing ? "Edit Project" : "Add Project"}</h4>
              <button onClick={resetForm} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
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
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-medium text-slate-500">Name</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Description</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Created</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
          </tr></thead>
          <tbody>
            {projects.data?.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                <td className="py-3 px-4 text-slate-600">{p.description || "—"}</td>
                <td className="py-3 px-4 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => startEdit(p)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
