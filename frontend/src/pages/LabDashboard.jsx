import { useEffect, useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  Loader2,
  ClipboardList,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import { LAB_TESTS } from "../constants";

// Lab Technician station: work through the pending order queue and enter a
// numeric result for each. Results are range-validated by the backend; on
// success the order leaves the queue.
export default function LabDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await api.get("/v1/lab-orders/");
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  function handleResultSaved() {
    setSelected(null);
    loadQueue();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} logout={logout} subtitle="Diagnostic lab station" />

      <main className="max-w-4xl mx-auto p-6 grid md:grid-cols-2 gap-6">
        {/* Pending order queue */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            Pending orders
          </h2>

          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => setSelected(o)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      selected?.id === o.id ? "bg-teal-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-slate-800 font-medium">{o.test_name}</p>
                      {o.priority === "URGENT" && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{o.patient_name}</p>
                    <p className="text-xs font-mono text-slate-400">
                      LOINC {o.loinc_code}
                    </p>
                  </button>
                </li>
              ))}
              {orders.length === 0 && (
                <li className="px-3 py-8 text-center text-slate-400 text-sm">
                  No pending orders. All caught up!
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Result entry */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          {selected ? (
            <ResultEntryPanel order={selected} onSaved={handleResultSaved} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <FlaskConical className="w-8 h-8 mb-2" />
              <p>Select an order to enter its result.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ResultEntryPanel({ order, onSaved }) {
  const testMeta =
    LAB_TESTS.find((t) => t.value === order.test_name) || null;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setValue("");
    setError("");
    setSuccess("");
  }, [order.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/v1/lab-observations/", {
        patient: order.patient,
        lab_order: order.id,
        test_name: order.test_name,
        result_value: value,
      });
      setSuccess("Result recorded and order closed.");
      // Give the user a beat to see the confirmation, then refresh the queue.
      setTimeout(onSaved, 700);
    } catch (err) {
      const data = err?.response?.data;
      // The range error comes back keyed on result_value.
      const msg =
        data?.result_value?.[0] ||
        data?.detail ||
        "Could not save the result. Please check the value and try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div>
      <h2 className="font-semibold text-slate-800">{order.test_name}</h2>
      <p className="text-sm text-slate-500 mb-1">{order.patient_name}</p>
      <p className="text-xs font-mono text-slate-400 mb-4">
        LOINC {order.loinc_code}
      </p>

      {testMeta && (
        <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
          Valid range:{" "}
          <span className="font-medium text-slate-800">
            {testMeta.min}–{testMeta.max} {testMeta.unit}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
          {error}
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
            Result value {testMeta ? `(${testMeta.unit})` : ""}
          </label>
          <input
            type="number"
            step="0.01"
            min={testMeta?.min}
            max={testMeta?.max}
            className={field}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 14.20"
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5"
        >
          {busy && <Loader2 className="w-5 h-5 animate-spin" />}
          {busy ? "Saving…" : "Submit result"}
        </button>
      </form>
    </div>
  );
}
