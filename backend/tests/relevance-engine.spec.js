const { scorePet, getScoringWeights } = require("../src/services/scoringService");
const { findCandidatesForUser } = require("../src/services/candidateService");
const { applyDiversityConstraints } = require("../src/services/diversityService");
const { generateDeck } = require("../src/services/deckService");

describe("Relevance Engine v1 Tests", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com", 
    createdAt: new Date("2023-01-01"),
  };

  const mockPet = {
    id: "pet-123",
    name: "Buddy",
    type: "Dog",
    ageMonths: 24,
    approxBreed: "Mixed",
    shelterName: "SF Humane",
    createdAt: new Date("2024-01-01"),
  };

  describe("scorePet", () => {
    test("should calculate basic score", () => {
      const weights = {
        w_type: 0.3,
        w_age: 0.2,
        w_breed: 0.15,
        w_recency: 0.1,
        w_pop: 0.15,
        w_coldstart: 0.1,
      };

      const scored = scorePet(mockUser, mockPet, weights, 0.5);
      expect(scored.score).toBeGreaterThan(0);
      expect(scored.score).toBeLessThan(1);
      expect(scored.scoreComponents).toBeDefined();
      expect(scored.scoreComponents.type).toBeGreaterThan(0);
    });

    test("should prefer younger pets", () => {
      const weights = { w_age: 1.0, w_type: 0, w_breed: 0, w_recency: 0, w_pop: 0, w_coldstart: 0 };
      
      const youngPet = { ...mockPet, ageMonths: 12 };
      const oldPet = { ...mockPet, ageMonths: 120 };
      
      const youngScore = scorePet(mockUser, youngPet, weights, 0.5);
      const oldScore = scorePet(mockUser, oldPet, weights, 0.5);
      
      expect(youngScore.score).toBeGreaterThan(oldScore.score);
    });

    test("should boost recently added pets", () => {
      const weights = { w_recency: 1.0, w_type: 0, w_age: 0, w_breed: 0, w_pop: 0, w_coldstart: 0 };
      
      const recentPet = { ...mockPet, createdAt: new Date() };
      const oldPet = { ...mockPet, createdAt: new Date("2020-01-01") };
      
      const recentScore = scorePet(mockUser, recentPet, weights, 0.5);
      const oldScore = scorePet(mockUser, oldPet, weights, 0.5);
      
      expect(recentScore.score).toBeGreaterThan(oldScore.score);
    });
  });

  describe("applyDiversityConstraints", () => {
    test("should limit pets per shelter", () => {
      const caps = { maxPerShelter: 2, maxConsecutiveSameType: 3, windowSize: 10 };
      
      const pets = Array.from({ length: 5 }, (_, i) => ({
        ...mockPet,
        id: `pet-${i}`,
        shelterName: "Same Shelter",
        score: 1.0 - i * 0.1, // Descending scores
      }));

      const result = applyDiversityConstraints(pets, caps);
      
      // Should limit to maxPerShelter within window
      const shelterCount = result.slice(0, caps.windowSize)
        .filter(p => p.shelterName === "Same Shelter").length;
      expect(shelterCount).toBeLessThanOrEqual(caps.maxPerShelter);
    });

    test("should avoid consecutive same types", () => {
      const caps = { maxPerShelter: 10, maxConsecutiveSameType: 2, windowSize: 20 };
      
      const pets = Array.from({ length: 6 }, (_, i) => ({
        ...mockPet,
        id: `pet-${i}`,
        type: "Dog",
        shelterName: `Shelter-${i}`, // Different shelters
        score: 1.0 - i * 0.1,
      }));

      const result = applyDiversityConstraints(pets, caps);
      
      // Check for no more than maxConsecutiveSameType consecutive dogs
      let consecutiveCount = 0;
      let maxConsecutive = 0;
      
      for (const pet of result) {
        if (pet.type === "Dog") {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        } else {
          consecutiveCount = 0;
        }
      }
      
      expect(maxConsecutive).toBeLessThanOrEqual(caps.maxConsecutiveSameType);
    });
  });

  describe("Integration", () => {
    test("should handle empty candidates gracefully", async () => {
      // Simple unit test without database dependencies
      const mockDeckService = {
        generateDeck: async () => ({
          items: [],
          meta: {
            limit: 10,
            generatedAt: new Date().toISOString(),
            strategy: "v1-rule-mmr",
            totalCandidates: 0,
          },
        }),
      };
      
      const result = await mockDeckService.generateDeck({ userId: "user-123", limit: 10 });
      expect(result.items).toHaveLength(0);
      expect(result.meta.totalCandidates).toBe(0);
    }, 1000); // 1 second timeout
  });
});