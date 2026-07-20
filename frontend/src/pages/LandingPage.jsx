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

// Public marketing landing page. Explains what SwasthyaEHR offers and points
// visitors to Register / Login. No auth required.
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 p-2 shadow-sm">
            <HeartPulse className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Swasthya<span className="text-teal-600">EHR</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 text-center">
        <span className="inline-block rounded-full bg-teal-50 px-4 py-1 text-sm font-medium text-teal-700 ring-1 ring-teal-100">
          FHIR-enabled hospital records for Nepal
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          One Health Record,{" "}
          <span className="text-teal-600">Every Hospital</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          SwasthyaEHR lets patients register once, keep their full medical
          history in one place, and securely share it with any hospital — with
          their own approval. A complete outpatient system for reception,
          nurses, doctors, labs and pharmacy.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-teal-700"
          >
            Get started — it's free
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            I already have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          What we offer
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
            >
              <div className="inline-flex rounded-xl bg-teal-50 p-3 text-teal-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Register",
              text: "Create your profile from home or at the front desk.",
            },
            {
              step: "2",
              title: "Get treated",
              text: "Nurse records vitals, the doctor diagnoses and orders labs, the pharmacy dispenses.",
            },
            {
              step: "3",
              title: "Share when needed",
              text: "Approve a request and another hospital instantly sees your records.",
            },
          ].map(({ step, title, text }) => (
            <div key={step} className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-lg font-bold text-white">
                {step}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Departments we cover
        </h2>
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
          {DEPARTMENTS.map((d) => (
            <span
              key={d.value}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
            >
              {d.label}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
          <p className="font-semibold text-slate-700">
            Swasthya<span className="text-teal-600">EHR</span>
          </p>
          <p className="mt-1">
            A minor project demonstrating FHIR-based hospital interoperability.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            For educational use. Not a certified medical device.
          </p>
        </div>
      </footer>
    </div>
  );
}
