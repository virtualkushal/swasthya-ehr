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
  PATIENT: "/",

};
