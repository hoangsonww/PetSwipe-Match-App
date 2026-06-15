/**
 * Cat Health Scoring Constants
 * Thresholds and risk factors for health score calculations
 */

export const CAT_HEALTH_SCORING_CONSTANTS = {
  // Initial score
  INITIAL_SCORE: 100,
  MAX_SCORE: 100,
  MIN_SCORE: 0,

  // Age risk factors
  AGE_RISK: {
    YOUNG_KITTEN: { max: 1, penalty: 5 },
    KITTEN: { min: 1, max: 7, penalty: 0 },
    ADULT: { min: 7, max: 10, penalty: 10 },
    SENIOR: { min: 10, max: 15, penalty: 25 },
    GERIATRIC: { min: 15, penalty: 40 },
  },

  // Weight risk factors (kg)
  WEIGHT_RISK: {
    UNDERWEIGHT: { max: 3, penalty: 15 },
    IDEAL: { min: 3, max: 5.5, penalty: 0 },
    SLIGHT_OVERWEIGHT: { min: 5.5, max: 6.5, penalty: 10 },
    OVERWEIGHT: { min: 6.5, max: 7.5, penalty: 20 },
    OBESE: { min: 7.5, penalty: 35 },
  },

  // Preventive care scoring
  PREVENTIVE_CARE: {
    RECENT_VET_VISIT_DAYS: 365, // within 1 year
    RECENT_VET_SCORE: 20,
    MODERATE_VET_VISIT_DAYS: 730, // within 2 years
    MODERATE_VET_SCORE: 10,
    MIN_VACCINATIONS: 2,
    VACCINATION_BONUS: 10,
  },

  // Behavioral health scoring
  BEHAVIORAL: {
    MULTIPLIER: 1.5,
    HIGH_ACTIVITY_BONUS: 10,
    MODERATE_ACTIVITY_BONUS: 5,
    MAX_BEHAVIORAL_SCORE: 25,
  },

  // Diet quality scoring
  DIET_QUALITY: {
    MULTIPLIER: 15 / 10, // 15% of score max per diet point
  },

  // Disease risk (breed)
  DISEASE_RISK: {
    HIGH_RISK_BREEDS: ['Bengal', 'Siamese', 'Ragdoll', 'Abyssinian'],
    BREED_RISK_PENALTY: 15,
  },

  // Screening age thresholds
  SCREENING_AGES: {
    BASIC: 0,
    SENIOR_START: 7,
    GERIATRIC_START: 10,
    VERY_GERIATRIC_START: 15,
  },

  // Nutrition thresholds (kg)
  NUTRITION: {
    OVERWEIGHT_THRESHOLD: 6,
    UNDERWEIGHT_THRESHOLD: 3,
    DIET_QUALITY_POOR_THRESHOLD: 5,
  },

  // Disease risk (age-based)
  DISEASE_AGE_RISK: {
    FIP: {
      YOUNG_THRESHOLD: 2,
      OLD_THRESHOLD: 10,
      OVERDUE_VET_DAYS: 365,
    },
    CKD: {
      RISK_AGE: 7,
      HIGH_RISK_AGE: 12,
    },
    HYPERTHYROIDISM: {
      RISK_AGE: 10,
    },
  },
} as const;
