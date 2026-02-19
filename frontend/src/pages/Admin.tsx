import { useState } from "react";
import Header from "@/components/layout/Header";
import UserManagement from "@/components/admin/UserManagement";
import DeptManagement from "@/components/admin/DeptManagement";
import ProjectManagement from "@/components/admin/ProjectManagement";
import KeyManagement from "@/components/admin/KeyManagement";
import SyncManagement from "@/components/admin/SyncManagement";
import { Users, Building2, FolderOpen, Key, RefreshCw } from "lucide-react";

type AdminTab = "users" | "departments" | "projects" | "keys" | "sync";

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { id: "departments", label: "Departments", icon: <Building2 className="h-4 w-4" /> },
  { id: "projects", label: "Projects", icon: <FolderOpen className="h-4 w-4" /> },
  { id: "keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
  { id: "sync", label: "Sync & Logs", icon: <RefreshCw className="h-4 w-4" /> },
];

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>("users");

  return (
    <div>
      <Header title="Admin Panel" />
      <div className="p-8">
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "users" && <UserManagement />}
        {tab === "departments" && <DeptManagement />}
        {tab === "projects" && <ProjectManagement />}
        {tab === "keys" && <KeyManagement />}
        {tab === "sync" && <SyncManagement />}
      </div>
    </div>
  );
}
