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

interface CatHealthIndicators {
  age: number;
  weight: number;
  breedPredispositions: string[];
  lastVetVisit: Date;
  vaccinations: string[];
  behavioralScore: number; // 1-10
  activityLevel: "low" | "moderate" | "high";
  dietQuality: number; // 1-10
}

export class CatHealthScore {
  /**
   * Calculate overall health score (0-100)
   */
  static calculateHealthScore(indicators: CatHealthIndicators): number {
    let score = 100;

    // Age factor (younger cats generally healthier)
    score -= this.ageRiskFactor(indicators.age);

    // Weight management (obesity is major risk factor)
    score -= this.weightRiskFactor(indicators.weight);

    // Disease predisposition (breed/genetic risk)
    score -= this.diseaseRiskFactor(indicators.breedPredispositions);

    // Preventive care compliance
    score += this.preventiveCareScore(
      indicators.lastVetVisit,
      indicators.vaccinations,
    );

    // Behavioral and activity indicators
    score += this.behavioralHealthScore(
      indicators.behavioralScore,
      indicators.activityLevel,
    );

    // Diet quality (major preventive factor)
    score += (indicators.dietQuality / 10) * 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify high-risk conditions for this cat
   */
  static identifyRisks(
    indicators: CatHealthIndicators,
  ): {
    condition: string;
    riskLevel: "low" | "medium" | "high";
    actions: string[];
  }[] {
    const risks = [];

    // FIP risk assessment - primarily affects young cats
    if (indicators.age < 2) {
      risks.push({
        condition: "Feline Infectious Peritonitis (FIP)",
        riskLevel: "high",
        actions: [
          "Schedule immediate veterinary consultation",
          "Consider FIP vaccine if appropriate",
          "Monitor for fever, lethargy, abdominal distension",
        ],
      });
    }

    // CKD risk (age 7+)
    if (indicators.age >= 7) {
      risks.push({
        condition: "Chronic Kidney Disease (CKD)",
        riskLevel: indicators.age >= 12 ? "high" : "medium",
        actions: [
          "Schedule annual kidney panel bloodwork",
          "Monitor water intake and urination",
          "Consider therapeutic diet if diagnosed",
        ],
      });
    }

    // Hyperthyroidism risk (age 10+)
    if (indicators.age >= 10) {
      risks.push({
        condition: "Hyperthyroidism",
        riskLevel: "medium",
        actions: [
          "Schedule thyroid function tests (T4)",
          "Monitor weight and behavior changes",
          "Discuss treatment options with vet",
        ],
      });
    }

    // Obesity-related risks
    if (indicators.dietQuality < 5) {
      risks.push({
        condition: "Obesity & Metabolic Disease",
        riskLevel: "high",
        actions: [
          "Consult with vet about nutrition plan",
          "Increase playtime and activity",
          "Monitor weight monthly",
          "Consider therapeutic diet",
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
          ? "Every 6 months"
          : indicators.age >= 7
            ? "Annually"
            : "Every 2 years",
      screeningTests: this.recommendedScreenings(indicators.age),
      nutritionRecommendations: this.nutritionPlan(
        indicators.weight,
        indicators.dietQuality,
      ),
      activityGoals: this.activityGoals(indicators.activityLevel),
      preventiveMeasures: this.preventiveMeasures(
        indicators.breedPredispositions,
        indicators.age,
      ),
    };
  }

  private static ageRiskFactor(age: number): number {
    if (age < 1) return 5;
    if (age < 7) return 0;
    if (age < 10) return 10;
    if (age < 15) return 25;
    return 40;
  }

  private static weightRiskFactor(weight: number): number {
    // Assuming weight in kg, average cat is 4-5kg
    if (weight < 3) return 15; // Underweight
    if (weight <= 5.5) return 0;
    if (weight <= 6.5) return 10;
    if (weight <= 7.5) return 20;
    return 35; // Obese
  }

  private static diseaseRiskFactor(breeds: string[]): number {
    const highRiskBreeds = ["Bengal", "Siamese", "Ragdoll", "Abyssinian"];
    // Use exact match to avoid false positives (e.g., "Bengal Tiger" shouldn't match "Bengal")
    const breedRisk = breeds.some((breed) =>
      highRiskBreeds.some((hb) =>
        breed.toLowerCase() === hb.toLowerCase(),
      ),
    )
      ? 15
      : 0;
    return breedRisk;
  }

  private static preventiveCareScore(
    lastVetVisit: Date,
    vaccinations: string[],
  ): number {
    const daysSinceVisit =
      (Date.now() - lastVetVisit.getTime()) / (24 * 60 * 60 * 1000);
    let score = 0;

    if (daysSinceVisit < 365) score += 20;
    else if (daysSinceVisit < 730) score += 10;

    if (vaccinations.length >= 2) score += 10;

    return score;
  }

  private static behavioralHealthScore(
    behavioralScore: number,
    activityLevel: string,
  ): number {
    let score = behavioralScore * 1.5;
    if (activityLevel === "high") score += 10;
    else if (activityLevel === "moderate") score += 5;
    return Math.min(score, 25);
  }

  private static recommendedScreenings(age: number): string[] {
    const screenings = ["Annual wellness exam"];

    if (age >= 7) {
      screenings.push("Blood chemistry panel", "Urinalysis");
    }

    if (age >= 10) {
      screenings.push("Thyroid panel (T4)", "Blood pressure");
    }

    if (age >= 15) {
      screenings.push("Cardiac ultrasound", "Advanced imaging as needed");
    }

    return screenings;
  }

  private static nutritionPlan(weight: number, dietQuality: number): string[] {
    const plans = [];

    if (weight > 6) {
      plans.push("High-protein, low-carb diet for weight management");
      plans.push("Measure portions carefully");
      plans.push("Increase water intake");
    } else if (weight < 3) {
      plans.push("Nutrient-dense food with higher calories");
      plans.push("Consider prescription diet if appropriate");
    } else {
      plans.push("Balanced, AAFCO-approved cat food");
    }

    if (dietQuality < 5) {
      plans.push("Switch to high-quality, vet-approved diet");
    }

    return plans;
  }

  private static activityGoals(activityLevel: string): string {
    switch (activityLevel) {
      case "low":
        return "20-30 minutes of active play daily, increase gradually";
      case "moderate":
        return "Maintain current activity, aim for 30-45 min/day";
      case "high":
        return "Maintain enriched environment, provide climbing/scratching";
      default:
        return "Consult veterinarian for personalized activity plan";
    }
  }

  private static preventiveMeasures(breeds: string[], age: number): string[] {
    const measures = [
      "Monthly parasite prevention",
      "Regular dental care",
      "Weight monitoring",
      "Annual vet wellness exam",
    ];

    if (age >= 7) {
      measures.push("Increase vet visit frequency");
      measures.push("Monitor for signs of chronic disease");
    }

    return measures;
  }
}

export default CatHealthScore;
