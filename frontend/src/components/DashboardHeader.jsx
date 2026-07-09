import { HeartPulse, LogOut } from "lucide-react";
import { ROLE_THEME, DEFAULT_THEME } from "../constants";

// Shared top bar for every role dashboard. Picks up a per-role color theme
// (gradient brand tile + role badge) so each workspace feels distinct while
// staying consistent. `subtitle` overrides the theme's default workspace label.
export default function DashboardHeader({ user, logout, subtitle }) {
  const theme = ROLE_THEME[user?.role] || DEFAULT_THEME;
  const initials = (user?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl bg-gradient-to-br ${theme.gradient} p-2 shadow-sm`}
          >
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-slate-800">
              Swasthya<span className="text-teal-600">EHR</span>
            </h1>
            <p className="text-xs text-slate-500">
              {subtitle || theme.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block ${theme.badge}`}
          >
            {user?.role}
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${theme.gradient} text-xs font-semibold text-white`}
            >
              {initials}
            </div>
            <span className="hidden text-sm text-slate-600 md:inline">
              {user?.full_name}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
