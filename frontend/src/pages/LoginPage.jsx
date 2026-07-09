import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, LogIn, Eye, EyeOff, User, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME } from "../constants";
import BrandMark from "../components/BrandMark";
import AuthArtwork from "../components/AuthArtwork";

// Split-screen auth screen. A Patient/Staff segmented toggle changes only the
// framing (both audiences use the same login endpoint) — patients get a
// "register" link, staff get a note that accounts are admin-provisioned.
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("patient"); // "patient" | "staff"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(username, password);
      navigate(ROLE_HOME[user.role] || "/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  }

  const isPatient = mode === "patient";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* left: form */}
      <div className="flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to continue to your dashboard.
          </p>

          {/* Patient / Staff toggle */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("patient")}
              className={
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                (isPatient
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              <User className="h-4 w-4" /> Patient
            </button>
            <button
              type="button"
              onClick={() => setMode("staff")}
              className={
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                (!isPatient
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              <Stethoscope className="h-4 w-4" /> Staff
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                placeholder={isPatient ? "e.g. your portal username" : "staff username"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors disabled:opacity-60 " +
                (isPatient
                  ? "bg-teal-600 hover:bg-teal-700"
                  : "bg-blue-600 hover:bg-blue-700")
              }
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>

          {isPatient ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              New patient?{" "}
              <Link to="/register" className="font-medium text-teal-700 hover:underline">
                Register here
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-xs text-slate-400">
              Staff accounts are created by a system administrator.
            </p>
          )}
        </div>
      </div>

      {/* right: artwork */}
      <AuthArtwork />
    </div>
  );
}
