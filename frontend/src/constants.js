// Frontend copies of backend vocabularies (v2). The backend re-validates
// everything; these drive dropdowns/labels. Big catalogs (lab tests, ICD-10,
// departments) are fetched live from the API instead of hardcoded here.

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN",
];

export const MARITAL_STATUS = [
  { value: "", label: "—" },
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
  { value: "OTHER", label: "Other" },
];

// Clinical staff roles that can self-register (admin/patient cannot).
export const STAFF_ROLES = [
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "LAB_TECH", label: "Laboratory Technician" },
  { value: "PHARMACIST", label: "Pharmacist" },
];

// The 7 departments (also fetched from /api/v1/departments/ for freshness).
export const DEPARTMENTS = [
  { value: "ENDOCRINOLOGY", label: "Diabetes & Endocrinology" },
  { value: "INTERNAL_MEDICINE", label: "Internal Medicine" },
  { value: "NEPHROLOGY", label: "Nephrology" },
  { value: "CARDIOLOGY", label: "Cardiology" },
  { value: "GASTROENTEROLOGY", label: "Gastroenterology / Hepatobiliary" },
  { value: "INFECTIOUS_DISEASES", label: "Infectious Diseases" },
  { value: "HEMATOLOGY", label: "Hematology" },
];

export const ENCOUNTER_STATUS_LABELS = {
  REGISTERED: "Registered",
  VITALS_DONE: "Vitals recorded",
  WITH_DOCTOR: "With doctor",
  LAB_PENDING: "Awaiting lab",
  LAB_DONE: "Lab complete",
  CLOSED: "Closed",
};

// Where each role lands after login.
export const ROLE_HOME = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  NURSE: "/nurse",
  PHARMACIST: "/pharmacy",
  LAB_TECH: "/lab",
  PATIENT: "/portal",
};

// Per-role visual theme for the dashboard chrome.
export const ROLE_THEME = {
  ADMIN: { label: "Administrator", badge: "bg-slate-100 text-slate-700", gradient: "from-slate-600 to-slate-800", ring: "ring-slate-200", tint: "from-slate-50 to-white" },
  DOCTOR: { label: "Consultation Room", badge: "bg-blue-100 text-blue-700", gradient: "from-blue-500 to-indigo-600", ring: "ring-blue-200", tint: "from-blue-50 to-white" },
  RECEPTIONIST: { label: "Front Desk", badge: "bg-amber-100 text-amber-700", gradient: "from-amber-500 to-orange-600", ring: "ring-amber-200", tint: "from-amber-50 to-white" },
  NURSE: { label: "Nursing Station", badge: "bg-rose-100 text-rose-700", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-200", tint: "from-rose-50 to-white" },
  PHARMACIST: { label: "Dispensing Window", badge: "bg-emerald-100 text-emerald-700", gradient: "from-emerald-500 to-green-600", ring: "ring-emerald-200", tint: "from-emerald-50 to-white" },
  LAB_TECH: { label: "Diagnostic Lab", badge: "bg-violet-100 text-violet-700", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-200", tint: "from-violet-50 to-white" },
  PATIENT: { label: "Patient Portal", badge: "bg-teal-100 text-teal-700", gradient: "from-teal-500 to-cyan-600", ring: "ring-teal-200", tint: "from-teal-50 to-white" },
};

export const DEFAULT_THEME = {
  label: "Workspace",
  badge: "bg-slate-100 text-slate-700",
  gradient: "from-teal-500 to-blue-600",
  ring: "ring-slate-200",
  tint: "from-slate-50 to-white",
};
