import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HeartPulse, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../constants";

// Email + password login for every role.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      // Force a password change on first login.
      if (user.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }
      navigate(ROLE_HOME[user.role] || "/", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Link to="/" className="rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 p-3 shadow-md">
            <HeartPulse className="h-7 w-7 text-white" />
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Swasthya<span className="text-teal-600">EHR</span>
          </h1>
          <p className="text-sm text-slate-500">Sign in to your workspace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-100"
        >
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-teal-600 hover:underline">
              Forgot password?
            </Link>
            <Link to="/register" className="text-slate-500 hover:underline">
              New patient? Register
            </Link>
          </div>
          <p className="text-center text-xs text-slate-400">
            Staff? <Link to="/staff-register" className="text-teal-600 hover:underline">Request a staff account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
