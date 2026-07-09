import { useEffect, useState } from "react";
import {
  Search,
  ShieldAlert,
  CheckCircle2,
  Pill,
  Loader2,
  FlaskConical,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import TrendChart from "../components/TrendChart";
import { LAB_TESTS, ROLE_THEME } from "../constants";




// Doctor cockpit: pick a patient, see their allergies, and write a
// prescription. If the medication matches a documented allergy, the backend
// blocks it and we render a red critical alert (the Pharmacy Safety Interceptor).
export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);

  async function load(query = "") {
    const res = await api.get("/v1/patients/", {
      params: query ? { search: query } : {},
    });
    setPatients(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${ROLE_THEME.DOCTOR.tint}`}>
      <DashboardHeader user={user} logout={logout} subtitle="Consultation room" />


      <main className="max-w-6xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        {/* Patient directory */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:col-span-1">

          <h2 className="font-semibold text-slate-800 mb-3">Patients</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
            className="relative mb-3"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or ID"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </form>

          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selected?.id === p.id ? "bg-teal-50" : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-slate-800">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    {p.hospital_identifier}
                  </p>
                </button>
              </li>
            ))}
            {patients.length === 0 && (
              <li className="px-3 py-6 text-center text-slate-400 text-sm">
                No patients found.
              </li>
            )}
          </ul>
        </section>

        {/* Prescription panel */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:col-span-2">
          {selected ? (
            <PrescribePanel patient={selected} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <Pill className="w-8 h-8 mb-2" />
              <p>Select a patient to write a prescription.</p>
            </div>
          )}
        </section>

        {/* Clinical timeline + lab-trend charts (full width) */}
        {selected && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:col-span-3">
            <ClinicalTimeline patient={selected} />
          </section>
        )}
      </main>
    </div>
  );
}

// Pulls the patient's full clinical history (prescriptions + lab results) and
// renders it as a chronological timeline alongside lab-trend charts.
function ClinicalTimeline({ patient }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get(`/v1/patients/${patient.id}/timeline/`)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active) setError("Could not load the patient timeline.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patient.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading clinical timeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
        {error}
      </div>
    );
  }

  const trends = data?.trends ?? [];
  const observations = data?.observations ?? [];
  const prescriptions = data?.prescriptions ?? [];

  // Merge results + prescriptions into one reverse-chronological event feed.
  const events = [
    ...observations.map((o) => ({
      kind: "lab",
      date: o.created_at,
      title: `${o.test_name}: ${o.result_value} ${o.result_unit}`,
      by: o.entered_by_name,
    })),
    ...prescriptions.map((p) => ({
      kind: "rx",
      date: p.created_at,
      title: `${p.medication_name} — ${p.dosage_instruction}`,
      by: p.prescribed_by_name,
      status: p.status,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-4">
        Clinical timeline — {patient.first_name} {patient.last_name}
      </h2>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lab-trend charts */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">
            Lab trends
          </h3>
          {trends.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">
              No lab results recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {trends.map((t) => (
                <TrendChart
                  key={t.test_name}
                  label={t.test_name}
                  unit={t.unit}
                  points={t.points}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chronological event feed */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2">History</h3>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">
              No clinical events yet.
            </p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {events.map((ev, i) => (
                <li key={i} className="ml-4">
                  <span
                    className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${
                      ev.kind === "lab" ? "bg-teal-500" : "bg-indigo-500"
                    }`}
                  />
                  <p className="text-xs text-slate-400">{fmt(ev.date)}</p>
                  <p className="text-sm text-slate-800">
                    <span
                      className={`inline-block text-[10px] font-semibold uppercase tracking-wide mr-2 px-1.5 py-0.5 rounded ${
                        ev.kind === "lab"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {ev.kind === "lab" ? "Lab" : "Rx"}
                    </span>
                    {ev.title}
                  </p>
                  {ev.by && (
                    <p className="text-xs text-slate-400">
                      by {ev.by}
                      {ev.status ? ` · ${ev.status}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}


function PrescribePanel({ patient }) {
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState(null); // safety alert payload
  const [success, setSuccess] = useState("");

  // Reset the panel whenever the doctor switches patients.
  useEffect(() => {
    setMedication("");
    setDosage("");
    setAlert(null);
    setSuccess("");
  }, [patient.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setAlert(null);
    setSuccess("");
    try {
      await api.post("/v1/prescriptions/", {
        patient: patient.id,
        medication_name: medication,
        dosage_instruction: dosage,
      });
      setSuccess(`Prescription for ${medication} authorized and queued.`);
      setMedication("");
      setDosage("");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.violation_type === "DRUG_ALLERGY_MATCH") {
        setAlert(data); // triggers the red critical banner
      } else {
        setAlert({
          message: "Could not save the prescription. Please try again.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const allergies = patient.allergies?.length ? patient.allergies : ["None"];
  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div>
      <h2 className="font-semibold text-slate-800">
        {patient.first_name} {patient.last_name}
      </h2>
      <p className="text-xs font-mono text-slate-400 mb-3">
        {patient.hospital_identifier}
      </p>

      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700 mb-1">
          Documented allergies
        </p>
        <p className="text-amber-900 text-sm">{allergies.join(", ")}</p>
      </div>

      {alert && (
        <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-300 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">
                {alert.violation_type === "DRUG_ALLERGY_MATCH"
                  ? "CRITICAL: Allergy conflict — prescription blocked"
                  : "Error"}
              </p>
              <p className="text-sm text-red-700 mt-0.5">{alert.message}</p>
              {alert.matched_allergen_token && (
                <p className="text-sm text-red-600 mt-1">
                  Matched allergen:{" "}
                  <span className="font-semibold">
                    {alert.matched_allergen_token}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-3 py-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Medication
          </label>
          <input
            className={field}
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="e.g. Penicillin G"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dosage instruction
          </label>
          <input
            className={field}
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 1 tablet every 8 hours for 7 days"
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5"
        >
          {busy && <Loader2 className="w-5 h-5 animate-spin" />}
          {busy ? "Verifying safety…" : "Confirm prescription"}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100">
        <OrderLabPanel patient={patient} />
      </div>
    </div>
  );
}

function OrderLabPanel({ patient }) {
  const [testName, setTestName] = useState(LAB_TESTS[0].value);
  const [priority, setPriority] = useState("ROUTINE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTestName(LAB_TESTS[0].value);
    setPriority("ROUTINE");
    setError("");
    setSuccess("");
  }, [patient.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/v1/lab-orders/", {
        patient: patient.id,
        test_name: testName,
        priority,
      });
      const label = LAB_TESTS.find((t) => t.value === testName)?.label;
      setSuccess(`${label} order sent to the lab queue.`);
    } catch {
      setError("Could not send the lab order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-teal-600" />
        Order a lab test
      </h3>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-3 py-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Test
          </label>
          <select
            className={field}
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          >
            {LAB_TESTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            className={field}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-white border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-60 font-medium rounded-lg px-4 py-2.5"
        >
          {busy && <Loader2 className="w-5 h-5 animate-spin" />}
          {busy ? "Sending…" : "Send to lab"}
        </button>
      </form>
    </div>
  );
}


