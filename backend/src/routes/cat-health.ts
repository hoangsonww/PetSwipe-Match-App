/**
 * Cat Health & Wellness Endpoints
 *
 * Provides comprehensive health scoring and risk assessment for cats
 * All endpoints require authentication
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { CAT_HEALTH_CONSTANTS } from '../constants/cat-health.constants';
import CatHealthScore from '../services/cat-wellness/CatHealthScore';
import CatDiseaseDetector from '../services/cat-detection/cat-disease-detector';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

interface CatHealthRequest {
  age: number;
  weight: number;
  breed?: string;
  lastVetVisit?: string;
  vaccinations?: string[];
  behavioralScore?: number;
  activityLevel?: 'low' | 'moderate' | 'high';
  dietQuality?: number;
}

/**
 * Validate cat health input
 */
function validateCatHealthInput(data: CatHealthRequest): { valid: boolean; error?: string } {
  if (data.age === undefined || data.age === null || data.age < CAT_HEALTH_CONSTANTS.AGE.MIN || data.age > CAT_HEALTH_CONSTANTS.AGE.MAX) {
    return { valid: false, error: `Age must be between ${CAT_HEALTH_CONSTANTS.AGE.MIN} and ${CAT_HEALTH_CONSTANTS.AGE.MAX}` };
  }
  if (data.weight === undefined || data.weight === null || data.weight <= CAT_HEALTH_CONSTANTS.WEIGHT.MIN || data.weight > CAT_HEALTH_CONSTANTS.WEIGHT.MAX) {
    return { valid: false, error: `Weight must be between ${CAT_HEALTH_CONSTANTS.WEIGHT.MIN} and ${CAT_HEALTH_CONSTANTS.WEIGHT.MAX} kg` };
  }
  return { valid: true };
}

/**
 * POST /api/cat-health/score
 * Calculate comprehensive health score for a cat
 */
router.post('/score', (req: Request<{}, {}, CatHealthRequest>, res: Response) => {
  try {
    const validation = validateCatHealthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      age,
      weight,
      breed = CAT_HEALTH_CONSTANTS.DEFAULT_BREED,
      lastVetVisit = new Date(Date.now() - CAT_HEALTH_CONSTANTS.DEFAULT_VET_VISIT_DAYS_AGO * 24 * 60 * 60 * 1000).toISOString(),
      vaccinations = [],
      behavioralScore = CAT_HEALTH_CONSTANTS.BEHAVIORAL.DEFAULT,
      activityLevel = CAT_HEALTH_CONSTANTS.ACTIVITY_LEVEL.DEFAULT,
      dietQuality = CAT_HEALTH_CONSTANTS.DIET_QUALITY.DEFAULT,
    } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: new Date(lastVetVisit),
      vaccinations,
      behavioralScore: Math.max(CAT_HEALTH_CONSTANTS.BEHAVIORAL.MIN, Math.min(CAT_HEALTH_CONSTANTS.BEHAVIORAL.MAX, behavioralScore)),
      activityLevel,
      dietQuality: Math.max(CAT_HEALTH_CONSTANTS.DIET_QUALITY.MIN, Math.min(CAT_HEALTH_CONSTANTS.DIET_QUALITY.MAX, dietQuality)),
    };

    const score = CatHealthScore.calculateHealthScore(indicators);
    const risks = CatHealthScore.identifyRisks(indicators);
    const plan = CatHealthScore.generateWellnessPlan(indicators);

    res.json({
      overallScore: Math.round(score),
      scoreRange: {
        excellent: score >= CAT_HEALTH_CONSTANTS.SCORE.EXCELLENT,
        good: score >= CAT_HEALTH_CONSTANTS.SCORE.GOOD && score < CAT_HEALTH_CONSTANTS.SCORE.EXCELLENT,
        fair: score >= CAT_HEALTH_CONSTANTS.SCORE.FAIR && score < CAT_HEALTH_CONSTANTS.SCORE.GOOD,
        poor: score < CAT_HEALTH_CONSTANTS.SCORE.FAIR,
      },
      risks,
      wellnessPlan: plan,
      assessmentDate: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to calculate health score',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/cat-health/risks
 * Get specific risk assessment for a cat
 */
router.post('/risks', (req: Request<{}, {}, CatHealthRequest>, res: Response) => {
  try {
    const validation = validateCatHealthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { age, weight, breed = CAT_HEALTH_CONSTANTS.DEFAULT_BREED, lastVetVisit, dietQuality = CAT_HEALTH_CONSTANTS.DIET_QUALITY.DEFAULT } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: lastVetVisit ? new Date(lastVetVisit) : new Date(),
      vaccinations: req.body.vaccinations || [],
      behavioralScore: CAT_HEALTH_CONSTANTS.BEHAVIORAL.DEFAULT,
      activityLevel: CAT_HEALTH_CONSTANTS.ACTIVITY_LEVEL.DEFAULT as const,
      dietQuality,
    };

    const risks = CatHealthScore.identifyRisks(indicators);

    res.json({
      catProfile: {
        age,
        breed,
      },
      identifiedRisks: risks,
      highPriorityActions: risks
        .filter((r) => r.riskLevel === 'high')
        .flatMap((r) => r.actions),
      assessmentDate: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to assess risks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/cat-health/wellness-plan
 * Generate a personalized wellness plan
 */
router.post('/wellness-plan', (req: Request<{}, {}, CatHealthRequest>, res: Response) => {
  try {
    const validation = validateCatHealthInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      age,
      weight,
      breed = CAT_HEALTH_CONSTANTS.DEFAULT_BREED,
      lastVetVisit,
      dietQuality = CAT_HEALTH_CONSTANTS.DIET_QUALITY.DEFAULT,
      activityLevel = CAT_HEALTH_CONSTANTS.ACTIVITY_LEVEL.DEFAULT,
    } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: lastVetVisit ? new Date(lastVetVisit) : new Date(),
      vaccinations: req.body.vaccinations || [],
      behavioralScore: req.body.behavioralScore || CAT_HEALTH_CONSTANTS.BEHAVIORAL.DEFAULT,
      activityLevel,
      dietQuality,
    };

    const plan = CatHealthScore.generateWellnessPlan(indicators);

    res.json({
      personalized: true,
      catAge: age,
      plan,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate wellness plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
