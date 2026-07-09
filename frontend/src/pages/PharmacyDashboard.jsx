import { useEffect, useState } from "react";
import { Pill, CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";

// Pharmacist dispensing window: the queue of active prescriptions, grouped by
// patient, each with a "Confirm dispensation" button that marks it completed.
export default function PharmacyDashboard() {
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState(null);
  const [flash, setFlash] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get("/v1/prescriptions/queue/");
    setQueue(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function fulfill(rx) {
    setFulfilling(rx.id);
    try {
      await api.post(`/v1/prescriptions/${rx.id}/fulfill/`);
      setFlash(`Dispensed ${rx.medication_name} for ${rx.patient_name}.`);
      setQueue((q) => q.filter((item) => item.id !== rx.id));
    } finally {
      setFulfilling(null);
    }
  }

  // Group the flat queue by patient for a cleaner counter view.
  const groups = queue.reduce((acc, rx) => {
    (acc[rx.patient_name] ||= []).push(rx);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} logout={logout} subtitle="Dispensing window" />

      <main className="max-w-3xl mx-auto p-6">
        {flash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3">
            <CheckCircle2 className="w-5 h-5" />
            {flash}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-700" /> Active queue
          </h2>
          <button
            onClick={load}
            className="text-sm text-teal-700 hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading queue…
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center text-slate-400 py-16 bg-white rounded-2xl border border-slate-200">
            <PackageCheck className="w-10 h-10 mx-auto mb-2" />
            <p>The queue is empty. All prescriptions have been dispensed.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groups).map(([patientName, items]) => (
              <div
                key={patientName}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="font-medium text-slate-800">{patientName}</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.map((rx) => (
                    <li
                      key={rx.id}
                      className="px-5 py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-slate-800">{rx.medication_name}</p>
                        <p className="text-sm text-slate-500">
                          {rx.dosage_instruction}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Prescribed by {rx.prescribed_by_name}
                        </p>
                      </div>
                      <button
                        onClick={() => fulfill(rx)}
                        disabled={fulfilling === rx.id}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-3 py-2 whitespace-nowrap"
                      >
                        {fulfilling === rx.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Confirm dispensation
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
