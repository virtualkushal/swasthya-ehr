import { useEffect, useState } from "react";
import { Loader2, Share2, Check, X, HeartPulse, FileText, Pill, Stethoscope } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import TrendChart from "../components/TrendChart";

// Read-only patient portal: your profile, clinical history, lab trends, and any
// cross-hospital access requests you can approve or deny.
export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [me, reqs] = await Promise.all([
        api.get("/v1/portal/me/"),
        api.get("/v1/portal/share-requests/"),
      ]);
      setData(me.data);
      setRequests(reqs.data.results || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    await api.post(`/v1/portal/share-requests/${id}/decision/`, { decision });
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50">
        <DashboardHeader user={user} logout={logout} />
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      </div>
    );
  }

  const p = data?.patient;
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <DashboardHeader user={user} logout={logout} />
      <main className="mx-auto max-w-4xl space-y-4 px-6 py-6">
        {p && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">{p.first_name} {p.last_name}</h2>
            <p className="text-sm text-slate-500">
              {p.hospital_identifier} · NID {p.national_id} · {p.gender} · {p.age} yrs · {p.blood_group}
            </p>
            {p.allergies?.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                Allergies: {p.allergies.join(", ")}
              </div>
            )}
          </div>
        )}

        {pending.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-amber-200">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <Share2 className="h-5 w-5 text-amber-500" /> Record access requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">Another hospital is requesting access to your records.</p>
            <ul className="mt-3 space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">{r.requester_label || "External hospital"}</span>
                  <div className="flex gap-2">
                    <button onClick={() => decide(r.id, "APPROVE")}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => decide(r.id, "DENY")}
                      className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                      <X className="h-4 w-4" /> Deny
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.trends?.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
              <HeartPulse className="h-5 w-5 text-teal-500" /> Lab trends
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {data.trends.map((t) => (
                <TrendChart key={t.test_code} points={t.points} unit={t.unit} label={t.test_name} />
              ))}
            </div>
          </div>
        )}

        <Section icon={Stethoscope} title="Diagnoses" items={data?.diagnoses}
          render={(d) => <>{d.disease_name} <span className="text-xs text-slate-400">({d.icd10_code}) · {d.clinical_status}</span></>} />
        <Section icon={FileText} title="Lab results" items={data?.lab_results}
          render={(r) => <>{r.test_name}: <b>{r.result_value ?? r.report_text}</b> {r.result_unit} {r.flag && r.flag !== "NORMAL" && <span className="text-red-600">({r.flag})</span>}</>} />
        <Section icon={Pill} title="Medications" items={data?.prescriptions}
          render={(p2) => <>{p2.medication_name} <span className="text-xs text-slate-400">· {p2.dosage_instruction} · {p2.status}</span></>} />
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, items, render }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        <Icon className="h-5 w-5 text-teal-500" /> {title}
      </h3>
      {!items || items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">None on record.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          {items.map((it) => <li key={it.id} className="border-b border-slate-50 pb-1.5">{render(it)}</li>)}
        </ul>
      )}
    </div>
  );
}
