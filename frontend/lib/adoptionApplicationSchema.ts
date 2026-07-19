import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Mirrors the `form_payload` fields proposed for `adoption_applications` in
// GitHub issue #61. Kept as a single schema (rather than per-step schemas)
// so validation stays simple; the form only triggers validation for the
// current step's fields via react-hook-form's `trigger()`.
//
// This lives in its own module (rather than inline in the form component)
// so it has no `@/components/...` imports and can be unit tested directly,
// since the frontend's current Jest config doesn't resolve the `@/` path
// alias used throughout the component tree.
// ──────────────────────────────────────────────────────────────────────────
export const adoptionApplicationSchema = z.object({
  // Step 1: contact info
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),

  // Step 2: household
  householdSize: z
    .string()
    .min(1, "Please select the number of people in your household"),
  housingType: z.enum(["own", "rent", "other"], {
    required_error: "Please select your housing type",
  }),
  landlordPermission: z.boolean().optional(),

  // Step 3: pet experience
  hasOtherPets: z.boolean().optional(),
  otherPetsDetails: z.string().trim().optional(),
  vetOrReferenceContact: z.string().trim().optional(),

  // Step 4: notes
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be under 1000 characters")
    .optional(),
});

export type AdoptionApplicationValues = z.infer<
  typeof adoptionApplicationSchema
>;

// Fields validated at each step before allowing "Next".
export const ADOPTION_APPLICATION_STEP_FIELDS: (keyof AdoptionApplicationValues)[][] =
  [
    ["fullName", "email", "phone"],
    ["householdSize", "housingType"],
    [], // pet experience fields are all optional
    [], // notes are optional
  ];

export const ADOPTION_APPLICATION_STEP_TITLES = [
  "Contact Information",
  "Household",
  "Pet Experience",
  "Anything Else?",
];
