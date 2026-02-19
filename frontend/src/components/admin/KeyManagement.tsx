import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, RefreshCw } from "lucide-react";
import { fetchProjects, fetchKeys, addKey, deleteKey, triggerSyncKey } from "@/api/admin";
import type { PlatformKey } from "@/types";
import { platformLabel } from "@/utils/formatters";

export default function KeyManagement() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "openai", api_key: "", key_label: "" });
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  const projects = useQuery({ queryKey: ["adminProjects"], queryFn: fetchProjects });
  const keys = useQuery({
    queryKey: ["projectKeys", selectedProject],
    queryFn: () => fetchKeys(selectedProject),
    enabled: !!selectedProject,
  });

  const addMut = useMutation({
    mutationFn: () => addKey(selectedProject, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projectKeys", selectedProject] }); setShowForm(false); setForm({ platform: "openai", api_key: "", key_label: "" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (keyId: string) => deleteKey(selectedProject, keyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projectKeys", selectedProject] }),
  });

  const handleSync = async (keyId: string) => {
    setSyncingKey(keyId);
    try {
      await triggerSyncKey(keyId);
      qc.invalidateQueries({ queryKey: ["projectKeys", selectedProject] });
    } finally {
      setSyncingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">API Keys</h3>
        {selectedProject && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add Key
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">-- Choose a project --</option>
          {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Add API Key</h4>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                <input value={form.key_label} onChange={(e) => setForm({ ...form, key_label: e.target.value })} required placeholder="e.g. OpenAI Prod Key" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google (Gemini)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} required placeholder="sk-..." className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                <p className="text-xs text-slate-400 mt-1">Your key will be encrypted before storage. It is never shown again.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Key</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-500">Label</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Platform</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-500">Last Synced</th>
              <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
            </tr></thead>
            <tbody>
              {keys.data?.map((k: PlatformKey) => (
                <tr key={k.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{k.key_label}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">{platformLabel(k.platform)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${k.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{k.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{k.last_synced_at ? new Date(k.last_synced_at).toLocaleString() : "Never"}</td>
                  <td className="py-3 px-4 text-right flex gap-1 justify-end">
                    <button onClick={() => handleSync(k.id)} disabled={syncingKey === k.id} className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-50">
                      <RefreshCw className={`h-4 w-4 ${syncingKey === k.id ? "animate-spin" : ""}`} />
                    </button>
                    <button onClick={() => { if (confirm("Delete this key?")) deleteMut.mutate(k.id); }} className="p-1.5 text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {keys.data?.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">No keys added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
