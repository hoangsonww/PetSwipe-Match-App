/**
 * Cat Disease Detector Service
 * 
 * Rapid preliminary assessment of cat health issues from symptom descriptions.
 * Not a replacement for vet diagnosis, but an early warning system.
 */

interface CatSymptomReport {
  symptoms: string[];
  duration: number; // days
  age: number; // years
  breed?: string;
  recentChanges?: string[];
}

interface DiseaseRiskAssessment {
  disease: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  confidence: number; // 0-1
  symptoms: string[];
  urgency: string;
  actions: string[];
}

/**
 * Constants for disease detection thresholds
 */
const DISEASE_DETECTION_CONSTANTS = {
  // Confidence scores
  CONFIDENCE: {
    FIP: 0.85,
    CKD: 0.75,
    HYPERTHYROIDISM: 0.7,
    DIABETES: 0.65,
    PANCREATITIS: 0.6,
  },
  // Age thresholds
  AGE: {
    YOUNG_CAT: 2,
    MATURE_CAT: 7,
    SENIOR_CAT: 10,
    VERY_SENIOR_CAT: 12,
    GERIATRIC_CAT: 15,
  },
  // Duration thresholds (days)
  DURATION: {
    ACUTE: 7,
    CHRONIC: 14,
  },
  // Symptom matching requirements
  SYMPTOMS: {
    MIN_FIP: 2,
    MIN_CKD: 2,
    MIN_HYPERTHYROIDISM: 2,
    MIN_DIABETES: 3,
    MIN_PANCREATITIS: 2,
  },
  // Consolidated symptom lists (single source of truth)
  SYMPTOM_LISTS: {
    FIP: ['fever', 'lethargy', 'abdominal distension', 'weight loss'],
    CKD: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
    HYPERTHYROIDISM: ['weight loss despite appetite', 'hyperactivity', 'increased thirst', 'vomiting'],
    DIABETES: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
    PANCREATITIS: ['vomiting', 'lethargy', 'abdominal pain', 'decreased appetite'],
  },
} as const;

export class CatDiseaseDetector {
  /**
   * Validate symptom report input
   */
  static validateReport(report: CatSymptomReport): { valid: boolean; error?: string } {
    if (!report.symptoms || report.symptoms.length === 0) {
      return { valid: false, error: 'At least one symptom is required' };
    }
    if (report.duration < 0 || report.duration > 3650) {
      return { valid: false, error: 'Duration must be 0-3650 days' };
    }
    if (report.age < 0 || report.age > 30) {
      return { valid: false, error: 'Age must be 0-30 years' };
    }
    return { valid: true };
  }

  /**
   * Assess disease risk from symptom report
   */
  static assessSymptomReport(report: CatSymptomReport): DiseaseRiskAssessment[] {
    const validation = this.validateReport(report);
    if (!validation.valid) {
      throw new Error(`Invalid report: ${validation.error}`);
    }

    const risks: DiseaseRiskAssessment[] = [];

    if (this.hasFIPIndicators(report)) {
      risks.push({
        disease: 'Feline Infectious Peritonitis (FIP)',
        riskLevel: 'critical',
        confidence: DISEASE_DETECTION_CONSTANTS.CONFIDENCE.FIP,
        symptoms: DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.FIP,
        urgency: 'IMMEDIATE - Requires emergency vet visit',
        actions: [
          'Contact vet immediately (today if possible)',
          'Mention: fever + lethargy + abdominal swelling',
          'Request: FIP antibody test (FCoV serology)',
          'Note: FIP is fatal without treatment. Early detection improves survival.',
        ],
      });
    }

    if (this.hasCKDIndicators(report)) {
      risks.push({
        disease: 'Chronic Kidney Disease (CKD)',
        riskLevel: report.age >= DISEASE_DETECTION_CONSTANTS.AGE.SENIOR_CAT ? 'high' : 'moderate',
        confidence: DISEASE_DETECTION_CONSTANTS.CONFIDENCE.CKD,
        symptoms: DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.CKD,
        urgency: 'Schedule vet appointment within 3-7 days',
        actions: [
          'Schedule bloodwork (BUN, creatinine, phosphorus)',
          'Measure water intake (mL/kg/day)',
          'Monitor litter box frequency',
          'If diagnosed, discuss therapeutic diet',
        ],
      });
    }

    if (this.hasHyperthyroidismIndicators(report)) {
      risks.push({
        disease: 'Hyperthyroidism',
        riskLevel: 'high',
        confidence: DISEASE_DETECTION_CONSTANTS.CONFIDENCE.HYPERTHYROIDISM,
        symptoms: DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.HYPERTHYROIDISM,
        urgency: 'Schedule vet appointment within 1-2 weeks',
        actions: [
          'Request: T4 test (thyroid hormone level)',
          'Monitor weight weekly',
          'If diagnosed, treatment options: pills, transdermal, radioactive iodine',
          'Hyperthyroidism is manageable but requires ongoing monitoring',
        ],
      });
    }

    if (this.hasDiabetesIndicators(report)) {
      risks.push({
        disease: 'Diabetes Mellitus',
        riskLevel: 'high',
        confidence: DISEASE_DETECTION_CONSTANTS.CONFIDENCE.DIABETES,
        symptoms: DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.DIABETES,
        urgency: 'Schedule vet appointment within 3-7 days',
        actions: [
          'Request: fasting blood glucose + urinalysis',
          'If diagnosed, insulin therapy + diet change can help',
          'Some cats go into remission with proper management',
          'Monitor for diabetic ketoacidosis (weakness, fruity breath)',
        ],
      });
    }

    if (this.hasPancreatitisIndicators(report)) {
      risks.push({
        disease: 'Pancreatitis',
        riskLevel: 'moderate',
        confidence: DISEASE_DETECTION_CONSTANTS.CONFIDENCE.PANCREATITIS,
        symptoms: DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.PANCREATITIS,
        urgency: 'Schedule vet appointment within 1-3 days',
        actions: [
          'Avoid food (fasting may help)',
          'Request: pancreatic lipase test (fPL)',
          'Abdominal ultrasound if confirmed',
          'Treatment: fluids, pain management, dietary adjustment',
        ],
      });
    }

    return this.sortRisksByLevel(risks);
  }

  /**
   * Sort risks by priority (critical → high → moderate → low)
   */
  private static sortRisksByLevel(risks: DiseaseRiskAssessment[]): DiseaseRiskAssessment[] {
    const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
    return risks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
  }

  /**
   * Check for FIP indicators
   */
  private static hasFIPIndicators(report: CatSymptomReport): boolean {
    const fipSymptoms = DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.FIP;
    const matchingSymptoms = fipSymptoms.filter((s) => report.symptoms.includes(s));

    const ageRisk = report.age < DISEASE_DETECTION_CONSTANTS.AGE.YOUNG_CAT || 
                    report.age > DISEASE_DETECTION_CONSTANTS.AGE.SENIOR_CAT;
    const durationRisk = report.duration >= DISEASE_DETECTION_CONSTANTS.DURATION.ACUTE;
    const symptomRisk = matchingSymptoms.length >= DISEASE_DETECTION_CONSTANTS.SYMPTOMS.MIN_FIP;

    return symptomRisk && (ageRisk || durationRisk);
  }

  /**
   * Check for CKD indicators
   */
  private static hasCKDIndicators(report: CatSymptomReport): boolean {
    const ckdSymptoms = DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.CKD;
    const matchingSymptoms = ckdSymptoms.filter((s) => report.symptoms.includes(s));

    const ageRisk = report.age >= DISEASE_DETECTION_CONSTANTS.AGE.MATURE_CAT;
    const symptomRisk = matchingSymptoms.length >= DISEASE_DETECTION_CONSTANTS.SYMPTOMS.MIN_CKD;
    const durationRisk = report.duration >= DISEASE_DETECTION_CONSTANTS.DURATION.CHRONIC;

    return (ageRisk || durationRisk) && symptomRisk;
  }

  /**
   * Check for hyperthyroidism indicators
   */
  private static hasHyperthyroidismIndicators(report: CatSymptomReport): boolean {
    const hyperSymptoms = DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.HYPERTHYROIDISM;
    const matchingSymptoms = hyperSymptoms.filter((s) => report.symptoms.some((rs) => rs.includes(s)));

    const ageRisk = report.age >= DISEASE_DETECTION_CONSTANTS.AGE.SENIOR_CAT;
    const symptomRisk = matchingSymptoms.length >= DISEASE_DETECTION_CONSTANTS.SYMPTOMS.MIN_HYPERTHYROIDISM;

    return (ageRisk || report.symptoms.length >= 3) && symptomRisk;
  }

  /**
   * Check for diabetes indicators
   */
  private static hasDiabetesIndicators(report: CatSymptomReport): boolean {
    const diabeteSymptoms = DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.DIABETES;
    const matchingSymptoms = diabeteSymptoms.filter((s) => report.symptoms.includes(s));

    return matchingSymptoms.length >= DISEASE_DETECTION_CONSTANTS.SYMPTOMS.MIN_DIABETES;
  }

  /**
   * Check for pancreatitis indicators
   */
  private static hasPancreatitisIndicators(report: CatSymptomReport): boolean {
    const pancreSymptoms = DISEASE_DETECTION_CONSTANTS.SYMPTOM_LISTS.PANCREATITIS;
    const matchingSymptoms = pancreSymptoms.filter((s) => report.symptoms.includes(s));

    const acuteOnset = report.duration <= DISEASE_DETECTION_CONSTANTS.DURATION.ACUTE;
    return matchingSymptoms.length >= DISEASE_DETECTION_CONSTANTS.SYMPTOMS.MIN_PANCREATITIS && acuteOnset;
  }

  /**
   * Generate plain English summary for cat owner
   */
  static generateSummary(risks: DiseaseRiskAssessment[]): string {
    if (risks.length === 0) {
      return 'No immediate health concerns detected based on reported symptoms. Monitor your cat and schedule a routine vet checkup if symptoms persist.';
    }

    const criticalRisks = risks.filter((r) => r.riskLevel === 'critical');
    const highRisks = risks.filter((r) => r.riskLevel === 'high');

    let summary = '';

    if (criticalRisks.length > 0) {
      summary += `⚠️ CRITICAL: Your cat may have ${criticalRisks[0].disease}. ${criticalRisks[0].urgency}\n\n`;
    }

    if (highRisks.length > 0) {
      summary += `⚠️ HIGH PRIORITY: Possible conditions include:\n`;
      highRisks.forEach((r) => {
        summary += `- ${r.disease} (${Math.round(r.confidence * 100)}% confidence)\n`;
      });
      summary += '\n';
    }

    summary += `DISCLAIMER: This assessment is based on symptom description only and is NOT a diagnosis. Only a veterinarian can diagnose disease. Schedule a vet appointment to confirm.`;

    return summary;
  }
}
