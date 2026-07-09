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
  LAB_TECH: "/",
  PATIENT: "/",
};
