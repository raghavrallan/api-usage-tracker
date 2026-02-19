import { NavLink } from "react-router-dom";
import { LayoutDashboard, BarChart3, Shield, LogOut, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-30">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <Activity className="h-7 w-7 text-indigo-400" />
        <span className="text-lg font-bold text-white tracking-tight">API Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard className="h-5 w-5" /> Dashboard
        </NavLink>
        <NavLink to="/analytics" className={linkClass}>
          <BarChart3 className="h-5 w-5" /> Analytics
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/admin" className={linkClass}>
            <Shield className="h-5 w-5" /> Admin
          </NavLink>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-slate-700 pt-4">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors">
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
