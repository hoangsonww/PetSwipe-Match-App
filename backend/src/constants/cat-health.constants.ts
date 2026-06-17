/**
 * Cat Health Constants
 * Centralized definitions for validation thresholds and default values
 */

export const CAT_HEALTH_CONSTANTS = {
  // Age validation (years)
  AGE: {
    MIN: 0,
    MAX: 30,
  },
  // Weight validation (kg)
  WEIGHT: {
    MIN: 0.1,
    MAX: 20,
  },
  // Health score ranges
  SCORE: {
    EXCELLENT: 85,
    GOOD: 70,
    FAIR: 50,
  },
  // Behavioral score (1-10)
  BEHAVIORAL: {
    MIN: 1,
    MAX: 10,
    DEFAULT: 5,
  },
  // Diet quality (1-10)
  DIET_QUALITY: {
    MIN: 1,
    MAX: 10,
    DEFAULT: 6,
  },
  // Activity levels
  ACTIVITY_LEVEL: {
    LOW: 'low',
    MODERATE: 'moderate',
    HIGH: 'high',
    DEFAULT: 'moderate',
  } as const,
  // Default breed
  DEFAULT_BREED: 'Mixed',
  // Default past vet visit (days ago)
  DEFAULT_VET_VISIT_DAYS_AGO: 365,
} as const;
