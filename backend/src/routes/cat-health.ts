/**
 * Cat Health & Wellness Endpoints
 *
 * Provides comprehensive health scoring and risk assessment for cats
 * All endpoints require authentication
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import CatHealthScore from '../services/cat-wellness/CatHealthScore';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

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
  if (!data.age || data.age < 0 || data.age > 30) {
    return { valid: false, error: 'Age must be between 0 and 30' };
  }
  if (!data.weight || data.weight <= 0 || data.weight > 20) {
    return { valid: false, error: 'Weight must be between 0 and 20 kg' };
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
      breed = 'Mixed',
      lastVetVisit = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      vaccinations = [],
      behavioralScore = 5,
      activityLevel = 'moderate',
      dietQuality = 6,
    } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: new Date(lastVetVisit),
      vaccinations,
      behavioralScore: Math.max(1, Math.min(10, behavioralScore)),
      activityLevel,
      dietQuality: Math.max(1, Math.min(10, dietQuality)),
    };

    const score = CatHealthScore.calculateHealthScore(indicators);
    const risks = CatHealthScore.identifyRisks(indicators);
    const plan = CatHealthScore.generateWellnessPlan(indicators);

    res.json({
      overallScore: Math.round(score),
      scoreRange: {
        excellent: score >= 85,
        good: score >= 70 && score < 85,
        fair: score >= 50 && score < 70,
        poor: score < 50,
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

    const { age, weight, breed = 'Mixed', lastVetVisit, dietQuality = 6 } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: lastVetVisit ? new Date(lastVetVisit) : new Date(),
      vaccinations: req.body.vaccinations || [],
      behavioralScore: 5,
      activityLevel: 'moderate' as const,
      dietQuality,
    };

    const risks = CatHealthScore.identifyRisks(indicators);

    res.json({
      catProfile: {
        age,
        weight,
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
      breed = 'Mixed',
      lastVetVisit,
      dietQuality = 6,
      activityLevel = 'moderate',
    } = req.body;

    const indicators = {
      age,
      weight,
      breedPredispositions: breed ? [breed] : [],
      lastVetVisit: lastVetVisit ? new Date(lastVetVisit) : new Date(),
      vaccinations: req.body.vaccinations || [],
      behavioralScore: req.body.behavioralScore || 5,
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
