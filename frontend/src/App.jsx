import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "./services/api";

// Sprint 1 landing page: confirms the React frontend can reach the Django
// backend by calling GET /api/v1/health/ and showing the result.
export default function App() {
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Activity className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">SwasthyaEHR</h1>
            <p className="text-sm text-slate-500">Hospital EHR & Pharmacy Safety System</p>
          </div>
        </div>

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
              <span>
                Connected — API reports “{state.data.status}”
              </span>
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
