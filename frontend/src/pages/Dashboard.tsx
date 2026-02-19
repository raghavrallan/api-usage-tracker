import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Zap, Key, FolderOpen, Hash } from "lucide-react";
import Header from "@/components/layout/Header";
import KPICard from "@/components/common/KPICard";
import UsageTrendChart from "@/components/charts/UsageTrendChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import ModelDistributionChart from "@/components/charts/ModelDistributionChart";
import TopProjectsChart from "@/components/charts/TopProjectsChart";
import { fetchOverview, fetchUsageTrends, fetchCostBreakdown, fetchModelDistribution, fetchTopProjects, fetchBillingSummary } from "@/api/dashboard";
import { formatCurrency, formatNumber, platformLabel } from "@/utils/formatters";

export default function Dashboard() {
  const [range, setRange] = useState("30d");

  const overview = useQuery({ queryKey: ["overview"], queryFn: fetchOverview });
  const trends = useQuery({ queryKey: ["trends", range], queryFn: () => fetchUsageTrends(range) });
  const costBd = useQuery({ queryKey: ["costBreakdown"], queryFn: fetchCostBreakdown });
  const models = useQuery({ queryKey: ["modelDist"], queryFn: fetchModelDistribution });
  const topProj = useQuery({ queryKey: ["topProjects"], queryFn: fetchTopProjects });
  const billing = useQuery({ queryKey: ["billingSummary"], queryFn: fetchBillingSummary });

  const kpi = overview.data;

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Total Tokens" value={kpi ? formatNumber(kpi.total_tokens) : "--"} icon={<Zap className="h-5 w-5 text-indigo-600" />} color="bg-indigo-50" />
          <KPICard title="Total Cost" value={kpi ? formatCurrency(kpi.total_cost) : "--"} icon={<Coins className="h-5 w-5 text-emerald-600" />} color="bg-emerald-50" />
          <KPICard title="Active Keys" value={kpi ? String(kpi.active_keys) : "--"} icon={<Key className="h-5 w-5 text-amber-600" />} color="bg-amber-50" />
          <KPICard title="Active Projects" value={kpi ? String(kpi.active_projects) : "--"} icon={<FolderOpen className="h-5 w-5 text-blue-600" />} color="bg-blue-50" />
          <KPICard title="Total Requests" value={kpi ? formatNumber(kpi.total_requests) : "--"} icon={<Hash className="h-5 w-5 text-purple-600" />} color="bg-purple-50" />
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Range:</span>
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {trends.data && <UsageTrendChart data={trends.data} />}
          </div>
          <div>
            {costBd.data && <CostBreakdownChart data={costBd.data} />}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {models.data && <ModelDistributionChart data={models.data} />}
          {topProj.data && <TopProjectsChart data={topProj.data} />}
        </div>

        {/* Billing summary table */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Billing Summary (Last 30 days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Platform</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Key</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Tokens</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">Cost</th>
                </tr>
              </thead>
              <tbody>
                {billing.data?.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{row.project_name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                        {platformLabel(row.platform)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{row.key_label}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">{formatNumber(row.tokens)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900">{formatCurrency(row.cost)}</td>
                  </tr>
                ))}
                {(!billing.data || billing.data.length === 0) && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No billing data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
