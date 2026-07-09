import { useEffect, useState } from "react";
import { Search, UserPlus, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PatientForm from "../components/PatientForm";
import DashboardHeader from "../components/DashboardHeader";

// Receptionist front desk: search existing patients (e.g. someone who
// self-registered from home) or key in a new walk-in profile.
export default function ReceptionDashboard() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [flash, setFlash] = useState("");

  async function load(query = "") {
    const res = await api.get("/v1/patients/", {
      params: query ? { search: query } : {},
    });
    setPatients(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(payload) {
    const res = await api.post("/v1/patients/", payload);
    setFlash(`Registered ${res.data.first_name} — ${res.data.hospital_identifier}`);
    setShowForm(false);
    load(search);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} logout={logout} subtitle="Front desk" />

      <main className="max-w-4xl mx-auto p-6">
        {flash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3">
            <CheckCircle2 className="w-5 h-5" />
            {flash}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
            className="flex items-center gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or hospital ID"
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </form>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-4 py-2 ml-3"
          >
            <UserPlus className="w-4 h-4" />
            {showForm ? "Close" : "New patient"}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Register walk-in patient
            </h2>
            <PatientForm onSubmit={handleCreate} submitLabel="Register patient" />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Hospital ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Allergies</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {p.hospital_identifier}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.phone_number}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.allergies?.length ? p.allergies.join(", ") : "None"}
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
