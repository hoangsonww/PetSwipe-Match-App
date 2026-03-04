/**
 * Cat Health Scoring Service
 *
 * Calculates comprehensive health scores for cats based on:
 * - Age-appropriate energy levels
 * - Weight management status
 * - Chronic disease risk (FIP, CKD, hyperthyroidism)
 * - Preventive care compliance
 * - Behavioral indicators of wellbeing
 */

import { Pet } from '../../entities/Pet';
import { CAT_HEALTH_SCORING_CONSTANTS } from '../../constants/cat-health-scoring.constants';

interface CatHealthIndicators {
  age: number;
  weight: number;
  breedPredispositions: string[];
  lastVetVisit: Date;
  vaccinations: string[];
  behavioralScore: number; // 1-10
  activityLevel: 'low' | 'moderate' | 'high';
  dietQuality: number; // 1-10
}

export class CatHealthScore {
  /**
   * Calculate overall health score (0-100)
   */
  static calculateHealthScore(indicators: CatHealthIndicators): number {
    let score = CAT_HEALTH_SCORING_CONSTANTS.INITIAL_SCORE;

    // Age factor (younger cats generally healthier)
    score -= this.ageRiskFactor(indicators.age);

    // Weight management (obesity is major risk factor)
    score -= this.weightRiskFactor(indicators.weight);

    // Disease predisposition (breed/genetic risk)
    score -= this.diseaseRiskFactor(indicators.breedPredispositions);

    // Preventive care compliance
    score += this.preventiveCareScore(
      indicators.lastVetVisit,
      indicators.vaccinations
    );

    // Behavioral and activity indicators
    score += this.behavioralHealthScore(
      indicators.behavioralScore,
      indicators.activityLevel
    );

    // Diet quality (major preventive factor)
    score += (indicators.dietQuality / 10) * CAT_HEALTH_SCORING_CONSTANTS.DIET_QUALITY.MULTIPLIER;

    return Math.max(CAT_HEALTH_SCORING_CONSTANTS.MIN_SCORE, Math.min(CAT_HEALTH_SCORING_CONSTANTS.MAX_SCORE, score));
  }

  /**
   * Identify high-risk conditions for this cat
   */
  static identifyRisks(
    indicators: CatHealthIndicators
  ): { condition: string; riskLevel: 'low' | 'medium' | 'high'; actions: string[] }[] {
    const { DISEASE_AGE_RISK } = CAT_HEALTH_SCORING_CONSTANTS;
    const risks = [];

    // FIP risk assessment
    if (
      indicators.age < DISEASE_AGE_RISK.FIP.YOUNG_THRESHOLD ||
      (indicators.age > DISEASE_AGE_RISK.FIP.OLD_THRESHOLD && indicators.lastVetVisit.getTime() < Date.now() - DISEASE_AGE_RISK.FIP.OVERDUE_VET_DAYS * 24 * 60 * 60 * 1000)
    ) {
      risks.push({
        condition: 'Feline Infectious Peritonitis (FIP)',
        riskLevel: 'high',
        actions: [
          'Schedule immediate veterinary consultation',
          'Consider FIP vaccine if appropriate',
          'Monitor for fever, lethargy, abdominal distension',
        ],
      });
    }

    // CKD risk (age 7+)
    if (indicators.age >= DISEASE_AGE_RISK.CKD.RISK_AGE) {
      risks.push({
        condition: 'Chronic Kidney Disease (CKD)',
        riskLevel: indicators.age >= DISEASE_AGE_RISK.CKD.HIGH_RISK_AGE ? 'high' : 'medium',
        actions: [
          'Schedule annual kidney panel bloodwork',
          'Monitor water intake and urination',
          'Consider therapeutic diet if diagnosed',
        ],
      });
    }

    // Hyperthyroidism risk (age 10+)
    if (indicators.age >= DISEASE_AGE_RISK.HYPERTHYROIDISM.RISK_AGE) {
      risks.push({
        condition: 'Hyperthyroidism',
        riskLevel: 'medium',
        actions: [
          'Schedule thyroid function tests (T4)',
          'Monitor weight and behavior changes',
          'Discuss treatment options with vet',
        ],
      });
    }

    // Obesity-related risks
    if (indicators.dietQuality < CAT_HEALTH_SCORING_CONSTANTS.NUTRITION.DIET_QUALITY_POOR_THRESHOLD) {
      risks.push({
        condition: 'Obesity & Metabolic Disease',
        riskLevel: 'high',
        actions: [
          'Consult with vet about nutrition plan',
          'Increase playtime and activity',
          'Monitor weight monthly',
          'Consider therapeutic diet',
        ],
      });
    }

    return risks;
  }

  /**
   * Generate personalized wellness plan
   */
  static generateWellnessPlan(indicators: CatHealthIndicators): {
    vetVisitFrequency: string;
    screeningTests: string[];
    nutritionRecommendations: string[];
    activityGoals: string;
    preventiveMeasures: string[];
  } {
    return {
      vetVisitFrequency:
        indicators.age >= 12
          ? 'Every 6 months'
          : indicators.age >= 7
            ? 'Annually'
            : 'Every 2 years',
      screeningTests: this.recommendedScreenings(indicators.age),
      nutritionRecommendations: this.nutritionPlan(
        indicators.weight,
        indicators.dietQuality
      ),
      activityGoals: this.activityGoals(indicators.activityLevel),
      preventiveMeasures: this.preventiveMeasures(
        indicators.breedPredispositions,
        indicators.age
      ),
    };
  }

  private static ageRiskFactor(age: number): number {
    const { AGE_RISK } = CAT_HEALTH_SCORING_CONSTANTS;

    if (age < AGE_RISK.YOUNG_KITTEN.max) return AGE_RISK.YOUNG_KITTEN.penalty;
    if (age < AGE_RISK.ADULT.min) return AGE_RISK.KITTEN.penalty;
    if (age < AGE_RISK.SENIOR.min) return AGE_RISK.ADULT.penalty;
    if (age < AGE_RISK.GERIATRIC.min) return AGE_RISK.SENIOR.penalty;
    return AGE_RISK.GERIATRIC.penalty;
  }

  private static weightRiskFactor(weight: number): number {
    const { WEIGHT_RISK } = CAT_HEALTH_SCORING_CONSTANTS;

    if (weight < WEIGHT_RISK.UNDERWEIGHT.max) return WEIGHT_RISK.UNDERWEIGHT.penalty;
    if (weight <= WEIGHT_RISK.IDEAL.max) return WEIGHT_RISK.IDEAL.penalty;
    if (weight <= WEIGHT_RISK.SLIGHT_OVERWEIGHT.max) return WEIGHT_RISK.SLIGHT_OVERWEIGHT.penalty;
    if (weight <= WEIGHT_RISK.OVERWEIGHT.max) return WEIGHT_RISK.OVERWEIGHT.penalty;
    return WEIGHT_RISK.OBESE.penalty;
  }

  private static diseaseRiskFactor(breeds: string[]): number {
    const { DISEASE_RISK } = CAT_HEALTH_SCORING_CONSTANTS;

    const breedRisk = breeds.some((breed) =>
      DISEASE_RISK.HIGH_RISK_BREEDS.some((hb) => breed.toLowerCase().includes(hb.toLowerCase()))
    )
      ? DISEASE_RISK.BREED_RISK_PENALTY
      : 0;
    return breedRisk;
  }

  private static preventiveCareScore(
    lastVetVisit: Date,
    vaccinations: string[]
  ): number {
    const { PREVENTIVE_CARE } = CAT_HEALTH_SCORING_CONSTANTS;
    const daysSinceVisit = (Date.now() - lastVetVisit.getTime()) / (24 * 60 * 60 * 1000);
    let score = 0;

    if (daysSinceVisit < PREVENTIVE_CARE.RECENT_VET_VISIT_DAYS) score += PREVENTIVE_CARE.RECENT_VET_SCORE;
    else if (daysSinceVisit < PREVENTIVE_CARE.MODERATE_VET_VISIT_DAYS) score += PREVENTIVE_CARE.MODERATE_VET_SCORE;

    if (vaccinations.length >= PREVENTIVE_CARE.MIN_VACCINATIONS) score += PREVENTIVE_CARE.VACCINATION_BONUS;

    return score;
  }

  private static behavioralHealthScore(
    behavioralScore: number,
    activityLevel: string
  ): number {
    const { BEHAVIORAL } = CAT_HEALTH_SCORING_CONSTANTS;

    let score = behavioralScore * BEHAVIORAL.MULTIPLIER;
    if (activityLevel === 'high') score += BEHAVIORAL.HIGH_ACTIVITY_BONUS;
    else if (activityLevel === 'moderate') score += BEHAVIORAL.MODERATE_ACTIVITY_BONUS;
    return Math.min(score, BEHAVIORAL.MAX_BEHAVIORAL_SCORE);
  }

  private static recommendedScreenings(age: number): string[] {
    const { SCREENING_AGES } = CAT_HEALTH_SCORING_CONSTANTS;
    const screenings = ['Annual wellness exam'];

    if (age >= SCREENING_AGES.SENIOR_START) {
      screenings.push('Blood chemistry panel', 'Urinalysis');
    }

    if (age >= SCREENING_AGES.GERIATRIC_START) {
      screenings.push('Thyroid panel (T4)', 'Blood pressure');
    }

    if (age >= SCREENING_AGES.VERY_GERIATRIC_START) {
      screenings.push('Cardiac ultrasound', 'Advanced imaging as needed');
    }

    return screenings;
  }

  private static nutritionPlan(weight: number, dietQuality: number): string[] {
    const { NUTRITION } = CAT_HEALTH_SCORING_CONSTANTS;
    const plans = [];

    if (weight > NUTRITION.OVERWEIGHT_THRESHOLD) {
      plans.push('High-protein, low-carb diet for weight management');
      plans.push('Measure portions carefully');
      plans.push('Increase water intake');
    } else if (weight < NUTRITION.UNDERWEIGHT_THRESHOLD) {
      plans.push('Nutrient-dense food with higher calories');
      plans.push('Consider prescription diet if appropriate');
    } else {
      plans.push('Balanced, AAFCO-approved cat food');
    }

    if (dietQuality < NUTRITION.DIET_QUALITY_POOR_THRESHOLD) {
      plans.push('Switch to high-quality, vet-approved diet');
    }

    return plans;
  }

  private static activityGoals(activityLevel: string): string {
    switch (activityLevel) {
      case 'low':
        return '20-30 minutes of active play daily, increase gradually';
      case 'moderate':
        return 'Maintain current activity, aim for 30-45 min/day';
      case 'high':
        return 'Maintain enriched environment, provide climbing/scratching';
      default:
        return 'Consult veterinarian for personalized activity plan';
    }
  }

  private static preventiveMeasures(breeds: string[], age: number): string[] {
    const measures = [
      'Monthly parasite prevention',
      'Regular dental care',
      'Weight monitoring',
      'Annual vet wellness exam',
    ];

    if (age >= 7) {
      measures.push('Increase vet visit frequency');
      measures.push('Monitor for signs of chronic disease');
    }

    return measures;
  }
}

export default CatHealthScore;
