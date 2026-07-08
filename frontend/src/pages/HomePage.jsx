import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, Loader2, LogOut } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Shared landing page. Confirms the backend connection and shows who is signed
// in. Roles without a dedicated dashboard yet (doctor, lab tech, pharmacist)
// land here until their screens are built in later parts.
export default function HomePage() {
  const { user, logout } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    api
      .get("/v1/health/")
      .then((res) => setState({ status: "ok", data: res.data }))
      .catch(() => setState({ status: "error", data: null }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Activity className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">SwasthyaEHR</h1>
              <p className="text-sm text-slate-500">
                Hospital EHR &amp; Pharmacy Safety System
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {user && (
          <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
              Signed in
            </p>
            <p className="text-slate-800">
              {user.full_name}{" "}
              <span className="text-slate-400">({user.role})</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              A dashboard for this role will arrive in a later part.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
            Backend connection
          </p>

          {state.status === "loading" && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking connection to the API…</span>
            </div>
          )}

          {state.status === "ok" && (
            <div className="flex items-center gap-2 text-teal-700">
              <CheckCircle2 className="w-5 h-5" />
              <span>Connected — API reports “{state.data.status}”</span>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span>Could not reach the backend. Is the Django server running?</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
