"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTab } from "@/components/admin/UsersTab";
import { DepartmentsTab } from "@/components/admin/DepartmentsTab";
import { ProjectsTab } from "@/components/admin/ProjectsTab";
import { AdminKeysTab } from "@/components/admin/AdminKeysTab";
import { PlatformKeysTab } from "@/components/admin/PlatformKeysTab";
import { SyncLogsTab } from "@/components/admin/SyncLogsTab";
import { Users, Building2, FolderOpen, KeyRound, Key, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("users");

  if (!session) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-[400px]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage users, projects, API keys, and sync operations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Departments</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Projects</TabsTrigger>
          <TabsTrigger value="admin-keys" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />Admin Keys</TabsTrigger>
          <TabsTrigger value="platform-keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Sync & Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="departments" className="mt-4"><DepartmentsTab /></TabsContent>
        <TabsContent value="projects" className="mt-4"><ProjectsTab /></TabsContent>
        <TabsContent value="admin-keys" className="mt-4"><AdminKeysTab /></TabsContent>
        <TabsContent value="platform-keys" className="mt-4"><PlatformKeysTab /></TabsContent>
        <TabsContent value="sync" className="mt-4"><SyncLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
