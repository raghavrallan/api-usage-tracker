import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { fetchSyncLogs, triggerSyncAll, updateSyncInterval } from "@/api/admin";

export default function SyncManagement() {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [interval, setInterval] = useState(6);

  const logs = useQuery({ queryKey: ["syncLogs"], queryFn: fetchSyncLogs });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSyncAll();
      qc.invalidateQueries({ queryKey: ["syncLogs"] });
    } finally {
      setSyncing(false);
    }
  };

  const handleIntervalUpdate = async () => {
    await updateSyncInterval(interval);
    alert(`Sync interval updated to ${interval} hours`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Sync & Logs</h3>
        <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sync All Keys
        </button>
      </div>

      {/* Interval setting */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Auto-Sync Interval</h4>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={168}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <span className="text-sm text-slate-500">hours</span>
          <button onClick={handleIntervalUpdate} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900">Update</button>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Records</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Started</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Completed</th>
            <th className="text-left py-3 px-4 font-medium text-slate-500">Error</th>
          </tr></thead>
          <tbody>
            {logs.data?.map((log: any) => (
              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 capitalize">{log.sync_type}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    log.status === "success" ? "bg-green-50 text-green-700" : log.status === "failed" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                  }`}>{log.status}</span>
                </td>
                <td className="py-3 px-4">{log.records_synced}</td>
                <td className="py-3 px-4 text-slate-500">{log.started_at ? new Date(log.started_at).toLocaleString() : "—"}</td>
                <td className="py-3 px-4 text-slate-500">{log.completed_at ? new Date(log.completed_at).toLocaleString() : "—"}</td>
                <td className="py-3 px-4 text-red-500 text-xs truncate max-w-xs">{log.error_message || "—"}</td>
              </tr>
            ))}
            {(!logs.data || logs.data.length === 0) && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No sync logs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
