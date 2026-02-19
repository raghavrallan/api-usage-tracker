import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color: string;
}

export default function KPICard({ title, value, subtitle, icon, color }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
