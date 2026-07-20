import { useEffect, useState } from "react";
import { Activity, Loader2, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import { ENCOUNTER_STATUS_LABELS } from "../constants";

// Nurse workspace: see patients checked in and awaiting vitals, then record
// vitals (BMI auto-calculated by the backend) to advance them to the doctor.
export default function NurseDashboard() {
  const { user, logout } = useAuth();
  const [encounters, setEncounters] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/v1/encounters/", { params: { status: "REGISTERED" } });
      setEncounters(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <DashboardHeader user={user} logout={logout} />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Activity className="h-5 w-5 text-rose-500" /> Patients awaiting vitals
        </h2>

        {loading ? (
          <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>
        ) : encounters.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
            No patients waiting. New check-ins from reception will appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {encounters.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{e.patient_name}</p>
                  <p className="text-xs text-slate-500">
                    {e.hospital_identifier} · {e.department_display} · {ENCOUNTER_STATUS_LABELS[e.status]}
                  </p>
                </div>
                <button onClick={() => setActive(e)}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
                  Record vitals
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {active && (
        <VitalsModal
          encounter={active}
          onClose={() => setActive(null)}
          onSaved={() => { setActive(null); load(); }}
        />
      )}
    </div>
  );
}

function VitalsModal({ encounter, onClose, onSaved }) {
  const [form, setForm] = useState({
    height_cm: "", weight_kg: "", systolic_bp: "", diastolic_bp: "",
    pulse: "", temperature_c: "", spo2: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { encounter: encounter.id };
      for (const [k, v] of Object.entries(form)) if (v !== "") payload[k] = v;
      await api.post("/v1/vitals/", payload);
      setOk(true);
      setTimeout(onSaved, 700);
    } catch (err) {
      const d = err?.response?.data;
      const first = d && typeof d === "object" ? Object.values(d)[0] : null;
      setError(Array.isArray(first) ? first[0] : first || "Could not save vitals.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    ["height_cm", "Height (cm)"], ["weight_kg", "Weight (kg)"],
    ["systolic_bp", "Systolic BP"], ["diastolic_bp", "Diastolic BP"],
    ["pulse", "Pulse (bpm)"], ["temperature_c", "Temp (°C)"], ["spo2", "SpO₂ (%)"],
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Vitals — {encounter.patient_name}</h3>
        <p className="text-xs text-slate-500">BMI is calculated automatically.</p>
        {error && <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        {ok && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Saved — sending to doctor.
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {fields.map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
              <input type="number" step="0.1" value={form[k]} onChange={(e) => update(k, e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save vitals
          </button>
        </div>
      </form>
    </div>
  );
}
