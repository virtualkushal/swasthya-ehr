import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import PatientForm from "../components/PatientForm";

// Public self-registration (REQ-001). No login required — a patient fills this
// from home before their appointment and receives a hospital identifier.
export default function RegisterPage() {
  const [done, setDone] = useState(null); // holds the created patient on success

  async function handleSubmit(payload) {
    const res = await api.post("/v1/patients/register/", payload);
    setDone(res.data);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Activity className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">SwasthyaEHR</h1>
            <p className="text-sm text-slate-500">Patient self-registration</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">
              Registration complete
            </h2>
            <p className="text-slate-600 mt-1">
              Please show this ID at the front desk:
            </p>
            <p className="mt-3 text-2xl font-mono font-semibold text-teal-700">
              {done.hospital_identifier}
            </p>
            <button
              onClick={() => setDone(null)}
              className="mt-6 text-sm text-teal-700 hover:underline"
            >
              Register another patient
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5">
              Fill in your details below. You will get a hospital ID to present
              at reception.
            </p>
            <PatientForm onSubmit={handleSubmit} submitLabel="Register" />
            <p className="text-center text-sm text-slate-400 mt-6">
              Hospital staff?{" "}
              <Link to="/login" className="text-teal-700 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
