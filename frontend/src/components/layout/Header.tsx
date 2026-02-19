import { useAuth } from "@/context/AuthContext";

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 capitalize">
          {user?.role}
        </span>
      </div>
    </header>
  );
}
