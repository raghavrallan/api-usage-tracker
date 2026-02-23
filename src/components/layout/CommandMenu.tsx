"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Shield,
  Sun,
  Moon,
  Monitor,
  Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input placeholder="Type a command or search..." className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm">No results found.</Command.Empty>

            <Command.Group heading="Navigation">
              <Command.Item onSelect={() => runCommand(() => router.push("/dashboard"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push("/analytics"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <BarChart3 className="h-4 w-4" /> Analytics
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push("/admin"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Shield className="h-4 w-4" /> Admin Panel
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push("/settings"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Settings className="h-4 w-4" /> Settings
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Theme">
              <Command.Item onSelect={() => runCommand(() => setTheme("light"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Sun className="h-4 w-4" /> Light Mode
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => setTheme("dark"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Moon className="h-4 w-4" /> Dark Mode
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => setTheme("system"))} className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Monitor className="h-4 w-4" /> System Theme
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
