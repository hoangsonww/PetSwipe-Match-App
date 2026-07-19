/* global describe, test, expect */
import { adoptionApplicationSchema } from "../lib/adoptionApplicationSchema";

const validPayload = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "555-123-4567",
  householdSize: "2",
  housingType: "own" as const,
  landlordPermission: false,
  hasOtherPets: false,
  otherPetsDetails: "",
  vetOrReferenceContact: "",
  notes: "",
};

describe("adoptionApplicationSchema", () => {
  test("accepts a fully valid payload", () => {
    const result = adoptionApplicationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  test("rejects a missing/short full name", () => {
    const result = adoptionApplicationSchema.safeParse({
      ...validPayload,
      fullName: "J",
    });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid email", () => {
    const result = adoptionApplicationSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("rejects a missing housing type", () => {
    const withoutHousingType: Record<string, unknown> = { ...validPayload };
    delete withoutHousingType.housingType;
    const result = adoptionApplicationSchema.safeParse(withoutHousingType);
    expect(result.success).toBe(false);
  });

  test("rejects notes over 1000 characters", () => {
    const result = adoptionApplicationSchema.safeParse({
      ...validPayload,
      notes: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  test("allows optional fields to be omitted", () => {
    const minimal: Record<string, unknown> = { ...validPayload };
    for (const key of [
      "landlordPermission",
      "hasOtherPets",
      "otherPetsDetails",
      "vetOrReferenceContact",
      "notes",
    ]) {
      delete minimal[key];
    }
    const result = adoptionApplicationSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
