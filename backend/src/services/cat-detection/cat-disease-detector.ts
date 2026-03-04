/**
 * Cat Disease Detector Service
 * 
 * Rapid preliminary assessment of cat health issues from symptom descriptions.
 * Not a replacement for vet diagnosis, but an early warning system.
 */

interface CatSymptomReport {
  symptoms: string[]; // ["lethargy", "vomiting", "weight loss"]
  duration: number; // days
  age: number; // years
  breed?: string;
  recentChanges?: string[]; // ["diet change", "stress", "new environment"]
}

interface DiseaseRiskAssessment {
  disease: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  confidence: number; // 0-1
  symptoms: string[];
  urgency: string;
  actions: string[];
}

export class CatDiseaseDetector {
  /**
   * Assess disease risk from symptom report
   */
  static assessSymptomReport(report: CatSymptomReport): DiseaseRiskAssessment[] {
    const risks: DiseaseRiskAssessment[] = [];

    // FIP Risk Assessment
    if (this.hasFIPIndicators(report)) {
      risks.push({
        disease: 'Feline Infectious Peritonitis (FIP)',
        riskLevel: 'critical',
        confidence: 0.85,
        symptoms: ['fever', 'lethargy', 'abdominal distension', 'weight loss'],
        urgency: 'IMMEDIATE - Requires emergency vet visit',
        actions: [
          'Contact vet immediately (today if possible)',
          'Mention: fever + lethargy + abdominal swelling',
          'Request: FIP antibody test (FCoV serology)',
          'Note: FIP is fatal without treatment. Early detection improves survival.',
        ],
      });
    }

    // Chronic Kidney Disease (CKD) Risk
    if (this.hasCKDIndicators(report)) {
      risks.push({
        disease: 'Chronic Kidney Disease (CKD)',
        riskLevel: report.age >= 10 ? 'high' : 'moderate',
        confidence: 0.75,
        symptoms: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
        urgency: 'Schedule vet appointment within 3-7 days',
        actions: [
          'Schedule bloodwork (BUN, creatinine, phosphorus)',
          'Measure water intake (mL/kg/day)',
          'Monitor litter box frequency',
          'If diagnosed, discuss therapeutic diet',
        ],
      });
    }

    // Hyperthyroidism Risk
    if (this.hasHyperthyroidismIndicators(report)) {
      risks.push({
        disease: 'Hyperthyroidism',
        riskLevel: 'high',
        confidence: 0.7,
        symptoms: ['weight loss despite appetite', 'hyperactivity', 'increased thirst', 'vomiting'],
        urgency: 'Schedule vet appointment within 1-2 weeks',
        actions: [
          'Request: T4 test (thyroid hormone level)',
          'Monitor weight weekly',
          'If diagnosed, treatment options: pills, transdermal, radioactive iodine',
          'Hyperthyroidism is manageable but requires ongoing monitoring',
        ],
      });
    }

    // Diabetes Risk
    if (this.hasDiabetesIndicators(report)) {
      risks.push({
        disease: 'Diabetes Mellitus',
        riskLevel: 'high',
        confidence: 0.65,
        symptoms: ['increased thirst', 'increased urination', 'weight loss', 'lethargy'],
        urgency: 'Schedule vet appointment within 3-7 days',
        actions: [
          'Request: fasting blood glucose + urinalysis',
          'If diagnosed, insulin therapy + diet change can help',
          'Some cats go into remission with proper management',
          'Monitor for diabetic ketoacidosis (weakness, fruity breath)',
        ],
      });
    }

    // Pancreatitis Risk
    if (this.hasPancreatitisIndicators(report)) {
      risks.push({
        disease: 'Pancreatitis',
        riskLevel: 'moderate',
        confidence: 0.6,
        symptoms: ['vomiting', 'lethargy', 'abdominal pain', 'decreased appetite'],
        urgency: 'Schedule vet appointment within 1-3 days',
        actions: [
          'Avoid food (fasting may help)',
          'Request: pancreatic lipase test (fPL)',
          'Abdominal ultrasound if confirmed',
          'Treatment: fluids, pain management, dietary adjustment',
        ],
      });
    }

    // Sort by risk level (critical first)
    const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
    risks.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

    return risks;
  }

  /**
   * Check for FIP indicators
   */
  private static hasFIPIndicators(report: CatSymptomReport): boolean {
    const fipSymptoms = ['fever', 'lethargy', 'abdominal distension', 'weight loss', 'vomiting'];
    const matchingSymptoms = fipSymptoms.filter((s) => report.symptoms.includes(s));

    // FIP typically affects young cats (< 2 years) or older (> 10 years)
    const ageRisk = report.age < 2 || report.age > 10;
    const durationRisk = report.duration >= 7; // Acute presentation
    const symptomRisk = matchingSymptoms.length >= 2;

    return symptomRisk && (ageRisk || durationRisk);
  }

  /**
   * Check for CKD indicators
   */
  private static hasCKDIndicators(report: CatSymptomReport): boolean {
    const ckdSymptoms = ['increased thirst', 'increased urination', 'weight loss', 'lethargy', 'bad breath'];
    const matchingSymptoms = ckdSymptoms.filter((s) => report.symptoms.includes(s));

    // CKD primarily affects older cats
    const ageRisk = report.age >= 7;
    const symptomRisk = matchingSymptoms.length >= 2;
    const durationRisk = report.duration >= 14; // Chronic condition

    return (ageRisk || durationRisk) && symptomRisk;
  }

  /**
   * Check for hyperthyroidism indicators
   */
  private static hasHyperthyroidismIndicators(report: CatSymptomReport): boolean {
    const hyperSymptoms = [
      'weight loss despite appetite',
      'hyperactivity',
      'increased thirst',
      'increased urination',
      'vomiting',
    ];
    const matchingSymptoms = hyperSymptoms.filter((s) => report.symptoms.some((rs) => rs.includes(s)));

    // Affects older cats (10+)
    const ageRisk = report.age >= 10;
    const symptomRisk = matchingSymptoms.length >= 2;

    return (ageRisk || report.symptoms.length >= 3) && symptomRisk;
  }

  /**
   * Check for diabetes indicators
   */
  private static hasDiabetesIndicators(report: CatSymptomReport): boolean {
    const diabeteSymptoms = ['increased thirst', 'increased urination', 'weight loss', 'lethargy'];
    const matchingSymptoms = diabeteSymptoms.filter((s) => report.symptoms.includes(s));

    return matchingSymptoms.length >= 3;
  }

  /**
   * Check for pancreatitis indicators
   */
  private static hasPancreatitisIndicators(report: CatSymptomReport): boolean {
    const pancreSymptoms = ['vomiting', 'lethargy', 'decreased appetite', 'abdominal pain'];
    const matchingSymptoms = pancreSymptoms.filter((s) => report.symptoms.includes(s));

    const acuteOnset = report.duration <= 7;
    return matchingSymptoms.length >= 2 && acuteOnset;
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
