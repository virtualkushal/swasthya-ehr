import { useEffect, useState } from "react";
import {
  User,
  ShieldAlert,
  FlaskConical,
  Pill,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import DashboardHeader from "../components/DashboardHeader";
import TrendChart from "../components/TrendChart";
import { LAB_TESTS } from "../constants";

// Read-only patient portal (REQ personas 2.1 / 2.5). A signed-in patient sees
// ONLY their own profile, lab results, and medications. All scoping happens on
// the backend at /api/v1/portal/me/ (filtered by the linked user account), so
// the client never asks for anyone else's rows.
export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/v1/portal/me/");
        if (active) setData(res.data);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.detail ||
              "Could not load your records. Please try again later."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const labelFor = (code) =>
    LAB_TESTS.find((t) => t.value === code)?.label || code;

  const fmtDateTime = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} logout={logout} subtitle="Patient portal" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your
            records…
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            {error}
          </div>
        ) : (
          <>
            {/* Profile card */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <User className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {data.patient.first_name} {data.patient.last_name}
                  </h2>
                  <p className="text-sm text-slate-500 font-mono">
                    {data.patient.hospital_identifier}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-slate-400">Phone</dt>
                  <dd className="text-slate-700">{data.patient.phone_number}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Date of birth</dt>
                  <dd className="text-slate-700">
                    {data.patient.date_of_birth}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Gender</dt>
                  <dd className="text-slate-700 capitalize">
                    {data.patient.gender}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <span className="text-slate-400">Known allergies: </span>
                  {data.patient.allergies?.length ? (
                    <span className="text-slate-700">
                      {data.patient.allergies.join(", ")}
                    </span>
                  ) : (
                    <span className="text-slate-500">None recorded</span>
                  )}
                </div>
              </div>
            </section>

            {/* Lab trends */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">
                  My lab results
                </h3>
              </div>
              {data.trends.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.trends.map((t) => (
                    <TrendChart
                      key={t.test_name}
                      points={t.points}
                      unit={t.unit}
                      label={labelFor(t.test_name)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 bg-white rounded-lg border border-slate-200 p-4">
                  No lab results have been recorded yet.
                </p>
              )}
            </section>

            {/* Medications */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">My medications</h3>
              </div>
              {data.prescriptions.length ? (
                <ul className="space-y-2">
                  {data.prescriptions.map((p) => (
                    <li
                      key={p.id}
                      className="bg-white rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {p.medication_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {p.dosage_instruction}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Prescribed {fmtDateTime(p.created_at)}
                          {p.prescribed_by_name
                            ? ` · by ${p.prescribed_by_name}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                          p.status === "ACTIVE"
                            ? "bg-teal-50 text-teal-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.status === "ACTIVE" ? "Active" : "Dispensed"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 bg-white rounded-lg border border-slate-200 p-4">
                  You have no medications on record.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
