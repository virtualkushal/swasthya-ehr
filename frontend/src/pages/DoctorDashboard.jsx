import { useEffect, useState } from "react";
import { Search, ShieldAlert, CheckCircle2, Pill, Loader2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";

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
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} logout={logout} subtitle="Consultation room" />

      <main className="max-w-4xl mx-auto p-6 grid md:grid-cols-2 gap-6">
        {/* Patient directory */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
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
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          {selected ? (
            <PrescribePanel patient={selected} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <Pill className="w-8 h-8 mb-2" />
              <p>Select a patient to write a prescription.</p>
            </div>
          )}
        </section>
      </main>
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
    </div>
  );
}
