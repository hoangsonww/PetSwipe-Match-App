/**
 * Cat Disease Detection Constants
 * Thresholds for disease symptom analysis and risk assessment
 */

export const CAT_DISEASE_DETECTION_CONSTANTS = {
  // Confidence scores per disease
  CONFIDENCE: {
    FIP: 0.85,
    CKD: 0.75,
    HYPERTHYROIDISM: 0.7,
    DIABETES: 0.65,
    PANCREATITIS: 0.6,
  } as const,

  // Age thresholds (years)
  AGE: {
    YOUNG_CAT: 2,
    MATURE_CAT: 7,
    SENIOR_CAT: 10,
    VERY_SENIOR_CAT: 12,
    GERIATRIC_CAT: 15,
  } as const,

  // Duration thresholds (days)
  DURATION: {
    ACUTE: 7,
    CHRONIC: 14,
  } as const,

  // Minimum symptom count requirements
  SYMPTOMS: {
    MIN_FIP: 2,
    MIN_CKD: 2,
    MIN_HYPERTHYROIDISM: 2,
    MIN_DIABETES: 3,
    MIN_PANCREATITIS: 2,
  } as const,

  // Validation ranges
  VALIDATION: {
    MIN_DURATION: 0,
    MAX_DURATION: 3650,
    MIN_AGE: 0,
    MAX_AGE: 30,
  } as const,

  // FIP specific thresholds
  FIP: {
    FIP_SYMPTOM_LIST: ['fever', 'lethargy', 'abdominal distension', 'weight loss'],
  } as const,

  // CKD specific thresholds
  CKD: {
    CKD_SYMPTOM_LIST: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
  } as const,

  // Hyperthyroidism specific thresholds
  HYPERTHYROIDISM: {
    HYPERTHYROIDISM_SYMPTOM_LIST: ['weight loss despite appetite', 'hyperactivity', 'increased thirst', 'vomiting'],
  } as const,

  // Diabetes specific thresholds
  DIABETES: {
    DIABETES_SYMPTOM_LIST: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
  } as const,

  // Pancreatitis specific thresholds
  PANCREATITIS: {
    PANCREATITIS_SYMPTOM_LIST: ['vomiting', 'abdominal pain', 'lethargy', 'decreased appetite'],
  } as const,

  // Consolidated symptom lists for disease detection (used in both risk assessment and indicator checks)
  SYMPTOM_LISTS: {
    FIP: ['fever', 'lethargy', 'abdominal distension', 'weight loss'],
    CKD: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
    HYPERTHYROIDISM: ['weight loss despite appetite', 'hyperactivity', 'increased thirst', 'vomiting'],
    DIABETES: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
    PANCREATITIS: ['vomiting', 'lethargy', 'abdominal pain', 'decreased appetite'],
  } as const,
} as const;
