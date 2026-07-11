import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ALLERGEN_VOCABULARY, GENDER_OPTIONS } from "../constants";

export default function PatientForm({
  onSubmit,
  submitLabel = "Register",
  withCredentials = false,
}) {
  const empty = {
    first_name: "",
    last_name: "",
    phone_number: "",
    date_of_birth: "",
    gender: "male",
    username: "",
    password: "",
    email: "",
  };
  const [form, setForm] = useState(empty);
  const [allergies, setAllergies] = useState(["None"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleAllergen(item) {
    setAllergies((current) => {
      if (item === "None") return ["None"];
      const withoutNone = current.filter((a) => a !== "None");
      if (withoutNone.includes(item)) {
        const next = withoutNone.filter((a) => a !== item);
        return next.length ? next : ["None"];
      }
      return [...withoutNone, item];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { username, password, ...demographics } = form;
      const payload = withCredentials
        ? { ...form, allergies }
        : { ...demographics, allergies };
      await onSubmit(payload);
      setForm(empty);
      setAllergies(["None"]);
    } catch (err) {
      const detail =
        err?.response?.data && typeof err.response.data === "object"
          ? Object.values(err.response.data).flat().join(" ")
          : "Something went wrong. Please check your entries and try again.";
      setError(detail);
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Login credentials now come first — every patient must set these up */}
      {withCredentials && (
        <>
          <p className="text-sm font-medium text-slate-700">
            Create your portal login
          </p>
          <p className="text-xs text-slate-400 -mt-2">
            Set a username and password to sign in and view your lab results and
            medications.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                className={field}
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className={field}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="Min 8 characters"
                required
              />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            First name
          </label>
          <input
            className={field}
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Last name
          </label>
          <input
            className={field}
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone number
          </label>
          <input
            className={field}
            value={form.phone_number}
            onChange={(e) => update("phone_number", e.target.value)}
            placeholder="+977-98XXXXXXXX"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of birth
          </label>
          <input
            type="date"
            className={field}
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Gender
        </label>
        <select
          className={field}
          value={form.gender}
          onChange={(e) => update("gender", e.target.value)}
        >
          {GENDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Known allergies
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ALLERGEN_VOCABULARY.map((item) => {
            const checked = allergies.includes(item);
            return (
              <label
                key={item}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                  checked
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-teal-600"
                  checked={checked}
                  onChange={() => toggleAllergen(item)}
                />
                {item}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Select "None" if the patient has no known allergies.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
      >
        {busy && <Loader2 className="w-5 h-5 animate-spin" />}
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
