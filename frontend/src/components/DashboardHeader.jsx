import { Activity, LogOut } from "lucide-react";

// Shared top bar for the role dashboards: brand on the left, signed-in user +
// sign-out on the right. `subtitle` labels the current role's workspace.
export default function DashboardHeader({ user, logout, subtitle }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Activity className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">SwasthyaEHR</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {user?.full_name}{" "}
            <span className="text-slate-400">({user?.role})</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
