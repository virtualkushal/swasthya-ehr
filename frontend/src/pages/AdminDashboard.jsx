import { useEffect, useState } from "react";
import {
  UserPlus,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import StatCard from "../components/StatCard";
import { ROLE_THEME } from "../constants";



const ROLES = ["RECEPTIONIST", "DOCTOR", "LAB_TECH", "PHARMACIST", "ADMIN"];

const emptyForm = {
  username: "",
  full_name: "",
  email: "",
  role: "DOCTOR",
  password: "",
};

// Admin-only dashboard: list all staff and create / deactivate accounts.
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await api.get("/v1/auth/staff/");
      setStaff(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("/v1/auth/staff/", form);
      setForm(emptyForm);
      await loadStaff();
    } catch (err) {
      const data = err.response?.data;
      const firstError =
        data && typeof data === "object"
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
              .join("  ")
          : "Could not create the account.";
      setFormError(firstError);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member) {
    await api.patch(`/v1/auth/staff/${member.id}/`, {
      is_active: !member.is_active,
    });
    await loadStaff();
  }

  const activeCount = staff.filter((m) => m.is_active).length;
  const doctorCount = staff.filter((m) => m.role === "DOCTOR").length;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${ROLE_THEME.ADMIN.tint}`}>
      <DashboardHeader user={user} logout={logout} subtitle="Staff & access control" />

      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Total staff" value={staff.length} tone="slate" />
          <StatCard icon={ShieldCheck} label="Active" value={activeCount} tone="emerald" />
          <StatCard icon={UserPlus} label="Doctors" value={doctorCount} tone="blue" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-3">

        {/* Create staff form */}
        <section className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-teal-700" />
              <h2 className="font-semibold text-slate-800">Add staff</h2>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <Field
                label="Full name"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                required
              />
              <Field
                label="Username"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                required
              />
              <Field
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                required
              />

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                Create account
              </button>
            </form>
          </div>
        </section>

        {/* Staff table */}
        <section className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Hospital staff</h2>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 p-6">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading staff…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Username</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50">
                      <td className="px-6 py-3 text-slate-800">{m.full_name}</td>
                      <td className="px-6 py-3 text-slate-600">{m.username}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {m.is_active ? (
                          <span className="text-teal-700">Active</span>
                        ) : (
                          <span className="text-slate-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {m.id === user?.id ? (
                          <span className="text-xs text-slate-400">You</span>
                        ) : (
                          <button
                            onClick={() => toggleActive(m)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            {m.is_active ? (
                              <>
                                <ShieldOff className="w-4 h-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" /> Activate
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                        No staff yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Small labelled text input used across the form.
function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
