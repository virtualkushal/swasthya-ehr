import { Link } from "react-router-dom";
import {
  HeartPulse,
  UserPlus,
  History,
  Share2,
  Stethoscope,
  ShieldCheck,
  Activity,
} from "lucide-react";

import { DEPARTMENTS } from "../constants";

// ─── tiny animated SVG node-graph (matches the reference image) ──────────────
function NodeGraph() {
  return (
    <svg
      viewBox="0 0 420 260"
      className="w-full max-w-md mx-auto opacity-90"
      aria-hidden="true"
    >
      {/* connecting lines */}
      <path
        d="M100 180 Q160 100 220 130 Q280 160 310 110 Q340 70 370 90"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      {/* nodes */}
      {[
        { cx: 100, cy: 180, icon: "📋", label: "Records" },
        { cx: 220, cy: 130, icon: "🩺", label: "Doctor" },
        { cx: 310, cy: 110, icon: "💊", label: "Pharmacy" },
        { cx: 370, cy: 90,  icon: "👤", label: "Patient" },
      ].map(({ cx, cy, icon, label }) => (
        <g key={label}>
          <circle
            cx={cx}
            cy={cy}
            r={28}
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            fontSize="18"
            dominantBaseline="middle"
          >
            {icon}
          </text>
        </g>
      ))}
      {/* patient node highlight (white circle like the image) */}
      <circle
        cx={370}
        cy={90}
        r={30}
        fill="white"
        opacity="0.95"
      />
      <text x={370} y={96} textAnchor="middle" fontSize="18">👤</text>
      {/* amber dot */}
      <circle cx={392} cy={68} r={7} fill="#f59e0b" />
    </svg>
  );
}

export default function LandingPage() {
  const features = [
    {
      icon: UserPlus,
      title: "Register Yourself",
      text: "Create your patient profile from home before you even reach the hospital — no queue, no paperwork.",
    },
    {
      icon: History,
      title: "Save Your History",
      text: "Every visit, diagnosis, lab result and medication is kept in one secure place you can revisit any time.",
    },
    {
      icon: Share2,
      title: "Share Across Hospitals",
      text: "Grant another hospital access to your records with your own approval — powered by the HL7 FHIR standard.",
    },
    {
      icon: Stethoscope,
      title: "Diagnose & Track",
      text: "Doctors record ICD-10 diagnoses, order lab tests, and track your results as trends over time.",
    },
    {
      icon: ShieldCheck,
      title: "Safe & Private",
      text: "You stay in control. Records are only shared when you say yes, and allergies are flagged to every doctor.",
    },
    {
      icon: Activity,
      title: "Whole Hospital",
      text: "Reception, nursing, doctors, lab and pharmacy all work from one connected system.",
    },
  ];

  const steps = [
    {
      n: "1",
      title: "Register",
      text: "Create your profile from home or at the front desk.",
    },
    {
      n: "2",
      title: "Get treated",
      text: "Nurse records vitals, the doctor diagnoses and orders labs, the pharmacy dispenses.",
    },
    {
      n: "3",
      title: "Share when needed",
      text: "Approve a request and another hospital instantly sees your records.",
    },
  ];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(135deg, #0fbcb0 0%, #1a8fe3 55%, #1565c0 100%)",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 backdrop-blur p-2 shadow">
            <HeartPulse className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Swasthya<span className="text-teal-100">EHR</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow hover:bg-blue-50 transition"
          >
            Register
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-4 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block rounded-full bg-white/15 border border-white/30 px-4 py-1 text-xs font-semibold tracking-wide uppercase text-white/90 mb-5">
            FHIR-enabled hospital records for Nepal
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white drop-shadow">
            One Health Record,{" "}
            <span className="text-teal-100">Every Hospital</span>
          </h1>
          <p className="mt-5 text-base text-white/80 leading-relaxed max-w-lg">
            SwasthyaEHR lets patients register once, keep their full medical
            history in one place, and securely share it with any hospital —
            with their own approval. A complete outpatient system for
            reception, nurses, doctors, labs and pharmacy.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition"
            >
              Get started — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-white/40 bg-white/10 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/20 transition"
            >
              I already have an account
            </Link>
          </div>
        </div>
        <div className="hidden md:block">
          <NodeGraph />
        </div>
      </section>

      {/* ── What we offer ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-white mb-2">
          What we offer
        </h2>
        <p className="text-center text-white/60 text-sm mb-10">
          Everything a modern hospital needs, in one connected platform.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-6 hover:bg-white/15 transition"
            >
              <div className="inline-flex rounded-xl bg-white/20 p-3 text-white mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-center text-2xl font-bold text-white mb-10">
          How it works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ n, title, text }) => (
            <div
              key={n}
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border border-white/40 text-lg font-bold text-white mb-4">
                {n}
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Departments ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-center text-2xl font-bold text-white mb-8">
          Departments we cover
        </h2>
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
          {DEPARTMENTS.map((d) => (
            <span
              key={d.value}
              className="rounded-full bg-white/15 border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 transition cursor-default"
            >
              {d.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-white/20">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/20 p-1.5">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white/80">
              Swasthya<span className="text-teal-100">EHR</span>
            </span>
          </div>
          <p>A minor project demonstrating FHIR-based hospital interoperability.</p>
          <Link
            to="/hospital-b"
            className="text-white/50 hover:text-white/80 transition text-xs underline underline-offset-2"
          >
            For other hospitals — access records
          </Link>
        </div>
        <p className="text-center text-xs text-white/30 pb-4">
          For educational use. Not a certified medical device.
        </p>
      </footer>
    </div>
  );
}
