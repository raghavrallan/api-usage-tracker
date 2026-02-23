"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { CommandMenu } from "./CommandMenu";

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthenticatedShell>{children}</AuthenticatedShell>
        <CommandMenu />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}
