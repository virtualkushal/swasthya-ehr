// Frontend copies of the fixed backend vocabularies. Kept in sync with
// backend/core/constants.py. The backend is still the source of truth and
// re-validates everything; these just drive the dropdowns/checkboxes.

export const ALLERGEN_VOCABULARY = [
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin",
  "NSAIDs",
  "Anticonvulsants",
  "None",
];

// The three supported lab tests. `value` is the code the API expects;
// range/unit drive the numeric input hints. Kept in sync with
// backend/core/constants.py -> LabTest.
export const LAB_TESTS = [
  { value: "HEMOGLOBIN", label: "Hemoglobin", unit: "g/dL", min: 0, max: 25 },
  { value: "WBC", label: "White Blood Cells", unit: "10^3/uL", min: 0, max: 50 },
  { value: "PLATELETS", label: "Platelets", unit: "10^3/uL", min: 0, max: 1000 },
];

export const GENDER_OPTIONS = [

  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

// Where each role lands after login.
export const ROLE_HOME = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  PHARMACIST: "/pharmacy",
  LAB_TECH: "/lab",
  PATIENT: "/portal",
};

// Per-role visual theme used by the dashboard chrome (header gradient, role
// badge, page accent). `label` is the friendly workspace name shown in the bar.
export const ROLE_THEME = {
  ADMIN: {
    label: "Administrator",
    badge: "bg-slate-100 text-slate-700",
    gradient: "from-slate-600 to-slate-800",
    ring: "ring-slate-200",
    tint: "from-slate-50 to-white",
  },
  DOCTOR: {
    label: "Consultation Room",
    badge: "bg-blue-100 text-blue-700",
    gradient: "from-blue-500 to-indigo-600",
    ring: "ring-blue-200",
    tint: "from-blue-50 to-white",
  },
  RECEPTIONIST: {
    label: "Front Desk",
    badge: "bg-amber-100 text-amber-700",
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-200",
    tint: "from-amber-50 to-white",
  },
  PHARMACIST: {
    label: "Dispensing Window",
    badge: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-500 to-green-600",
    ring: "ring-emerald-200",
    tint: "from-emerald-50 to-white",
  },
  LAB_TECH: {
    label: "Diagnostic Lab",
    badge: "bg-violet-100 text-violet-700",
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-200",
    tint: "from-violet-50 to-white",
  },
  PATIENT: {
    label: "Patient Portal",
    badge: "bg-teal-100 text-teal-700",
    gradient: "from-teal-500 to-cyan-600",
    ring: "ring-teal-200",
    tint: "from-teal-50 to-white",
  },
};

export const DEFAULT_THEME = {
  label: "Workspace",
  badge: "bg-slate-100 text-slate-700",
  gradient: "from-teal-500 to-blue-600",
  ring: "ring-slate-200",
  tint: "from-slate-50 to-white",
};



