import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, RefreshCw } from "lucide-react";
import Header from "@/components/layout/Header";
import { fetchProjects } from "@/api/admin";
import { fetchProjectDetail, fetchKeyDetail, fetchUserRanking, exportCSV } from "@/api/analytics";
import { fetchKeys, fetchDepartments, triggerSyncAll, fetchSyncStatus } from "@/api/admin";
import { fetchDepartmentDetail } from "@/api/analytics";
import { formatCurrency, formatNumber, formatDate, platformLabel } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";

type Tab = "projects" | "keys" | "departments" | "users";

export default function Analytics() {
  const [tab, setTab] = useState<Tab>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  const projects = useQuery({ queryKey: ["adminProjects"], queryFn: fetchProjects });
  const departments = useQuery({ queryKey: ["adminDepts"], queryFn: fetchDepartments });
  const keys = useQuery({
    queryKey: ["projectKeys", selectedProjectId],
    queryFn: () => fetchKeys(selectedProjectId),
    enabled: !!selectedProjectId,
  });
  const projectDetail = useQuery({
    queryKey: ["projectDetail", selectedProjectId],
    queryFn: () => fetchProjectDetail(selectedProjectId),
    enabled: tab === "projects" && !!selectedProjectId,
  });
  const keyDetail = useQuery({
    queryKey: ["keyDetail", selectedKeyId],
    queryFn: () => fetchKeyDetail(selectedKeyId),
    enabled: tab === "keys" && !!selectedKeyId,
  });
  const deptDetail = useQuery({
    queryKey: ["deptDetail", selectedDeptId],
    queryFn: () => fetchDepartmentDetail(selectedDeptId),
    enabled: tab === "departments" && !!selectedDeptId,
  });
  const userRanking = useQuery({
    queryKey: ["userRanking"],
    queryFn: fetchUserRanking,
    enabled: tab === "users",
  });
  const syncStatus = useQuery({ queryKey: ["syncStatus"], queryFn: fetchSyncStatus });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSyncAll();
      syncStatus.refetch();
    } finally {
      setSyncing(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "projects", label: "By Project" },
    { id: "keys", label: "By Key" },
    { id: "departments", label: "By Department" },
    { id: "users", label: "By User" },
  ];

  return (
    <div>
      <Header title="Analytics" />
      <div className="p-8 space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === t.id ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {user?.role === "admin" && (
              <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sync All
              </button>
            )}
            <button onClick={() => exportCSV("30d")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* By Project */}
        {tab === "projects" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Choose a project --</option>
                {projects.data?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {projectDetail.data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="Total Tokens" value={formatNumber(projectDetail.data.total_tokens)} />
                  <StatCard label="Total Cost" value={formatCurrency(projectDetail.data.total_cost)} />
                  <StatCard label="Total Requests" value={formatNumber(projectDetail.data.total_requests)} />
                  <StatCard label="Keys" value={String(projectDetail.data.keys_count)} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Daily Usage</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={projectDetail.data.daily_usage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Model Breakdown</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={projectDetail.data.model_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="model" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="tokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <DataTable
                  title="Daily Usage Details"
                  headers={["Date", "Tokens", "Cost", "Requests"]}
                  rows={projectDetail.data.daily_usage.map((d) => [d.date, formatNumber(d.tokens), formatCurrency(d.cost), formatNumber(d.requests)])}
                />
              </>
            )}
          </div>
        )}

        {/* By Key */}
        {tab === "keys" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Project</label>
                  <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedKeyId(""); }}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">-- Choose a project --</option>
                    {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Key</label>
                  <select value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">-- Choose a key --</option>
                    {keys.data?.map((k) => <option key={k.id} value={k.id}>{k.key_label} ({platformLabel(k.platform)})</option>)}
                  </select>
                </div>
              </div>
            </div>
            {keyDetail.data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="Platform" value={platformLabel(keyDetail.data.platform)} />
                  <StatCard label="Total Tokens" value={formatNumber(keyDetail.data.total_tokens)} />
                  <StatCard label="Total Cost" value={formatCurrency(keyDetail.data.total_cost)} />
                  <StatCard label="Total Requests" value={formatNumber(keyDetail.data.total_requests)} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Daily Usage</h4>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={keyDetail.data.daily_usage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <DataTable
                    title="Model Breakdown"
                    headers={["Model", "Tokens", "Cost", "Requests"]}
                    rows={keyDetail.data.model_breakdown.map((m) => [m.model, formatNumber(m.tokens), formatCurrency(m.cost), formatNumber(m.requests)])}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* By Department */}
        {tab === "departments" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Department</label>
              <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">-- Choose a department --</option>
                {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {deptDetail.data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Projects" value={String(deptDetail.data.projects_count)} />
                  <StatCard label="Total Tokens" value={formatNumber(deptDetail.data.total_tokens)} />
                  <StatCard label="Total Cost" value={formatCurrency(deptDetail.data.total_cost)} />
                </div>
                <DataTable
                  title="Project Breakdown"
                  headers={["Project", "Tokens", "Cost"]}
                  rows={deptDetail.data.project_breakdown.map((p) => [p.project_name, formatNumber(p.tokens), formatCurrency(p.cost)])}
                />
              </>
            )}
          </div>
        )}

        {/* By User */}
        {tab === "users" && (
          <div className="space-y-6">
            <DataTable
              title="User Usage Ranking"
              headers={["Name", "Email", "Department", "Projects", "Total Tokens", "Total Cost"]}
              rows={
                userRanking.data?.map((u) => [
                  u.full_name, u.email, u.department_name || "—",
                  String(u.projects_count), formatNumber(u.total_tokens), formatCurrency(u.total_cost),
                ]) || []
              }
            />
          </div>
        )}

        {/* Sync status */}
        {syncStatus.data && Array.isArray(syncStatus.data) && syncStatus.data.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Recent Sync Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Status</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Records</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Started</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {syncStatus.data.slice(0, 10).map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="py-2 px-4 capitalize">{log.sync_type}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === "success" ? "bg-green-50 text-green-700" : log.status === "failed" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                        }`}>{log.status}</span>
                      </td>
                      <td className="py-2 px-4">{log.records_synced}</td>
                      <td className="py-2 px-4 text-slate-500">{log.started_at ? new Date(log.started_at).toLocaleString() : "—"}</td>
                      <td className="py-2 px-4 text-red-500 text-xs truncate max-w-xs">{log.error_message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h4 className="text-sm font-semibold text-slate-900 mb-4">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {headers.map((h) => (
                <th key={h} className="text-left py-2 px-4 font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-4 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={headers.length} className="py-8 text-center text-slate-400">No data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
