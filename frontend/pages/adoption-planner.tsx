import React, { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  HeartHandshake,
  Home,
  HousePlus,
  Loader2,
  MessageSquareQuote,
  PawPrint,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  Wallet,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { AppUser, Pet, Swipe, swipeApi, userApi } from "@/lib/api";

type PlannerData = {
  user: AppUser;
  swipes: Swipe[];
  likedSwipes: Swipe[];
};

type PlannerMetric = {
  label: string;
  value: string;
};

type PetInsights = {
  pet: Pet;
  shortlistRank: number;
  likedAt: string;
  compatibilityScore: number;
  readinessScore: number;
  budgetMin: number;
  budgetMax: number;
  energyLabel: "Low" | "Medium" | "High";
  careLabel: "Low" | "Medium" | "High";
  livingFit: string;
  confidence: string;
  summary: string;
  monthlyTime: string;
  transitionTempo: string;
  homeSetupSummary: string;
  profileBoost: string;
  outreachNote: string;
  bestFor: string[];
  reasons: string[];
  watchouts: string[];
  checklist: string[];
  starterKit: string[];
  questions: string[];
  timeline: string[];
  metrics: PlannerMetric[];
};

const COMPAT_PAGE_SIZE = 4;

const fetchPlannerData = async (): Promise<PlannerData> => {
  const [profile, swipes, likedSwipes] = await Promise.all([
    userApi.getProfile(),
    swipeApi.listMySwipes(),
    swipeApi.listMyLikedSwipes(),
  ]);

  return {
    user: profile.user,
    swipes,
    likedSwipes,
  };
};

const energeticTerms = [
  "active",
  "athletic",
  "energetic",
  "playful",
  "outgoing",
  "runner",
  "hiking",
  "zoomies",
  "young",
  "puppy",
  "kitten",
  "husky",
  "shepherd",
  "terrier",
  "collie",
];

const calmTerms = [
  "calm",
  "gentle",
  "relaxed",
  "easygoing",
  "quiet",
  "senior",
  "laid-back",
  "couch",
  "snuggly",
  "mellow",
];

const highCareTerms = [
  "medical",
  "special needs",
  "grooming",
  "long hair",
  "long-haired",
  "poodle",
  "doodle",
  "persian",
  "anxious",
  "training",
];

const apartmentTerms = [
  "apartment",
  "small space",
  "indoor",
  "easygoing",
  "cat",
  "senior",
];

const houseTerms = [
  "yard",
  "farm",
  "large breed",
  "working dog",
  "high energy",
  "outdoors",
];

const familyTerms = ["kids", "children", "family", "gentle", "friendly"];
const petFriendlyTerms = [
  "dog-friendly",
  "cat-friendly",
  "other pets",
  "multi-pet",
  "bonded",
];

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function normalizePetText(pet: Pet) {
  return `${pet.type} ${pet.description ?? ""} ${pet.name}`.toLowerCase();
}

function getEnergyLabel(text: string): "Low" | "Medium" | "High" {
  if (containsAny(text, energeticTerms)) return "High";
  if (containsAny(text, calmTerms)) return "Low";
  return "Medium";
}

function getCareLabel(text: string): "Low" | "Medium" | "High" {
  if (containsAny(text, highCareTerms)) return "High";
  if (containsAny(text, ["independent", "easy", "low maintenance"])) {
    return "Low";
  }
  return "Medium";
}

function getLivingFit(text: string) {
  if (containsAny(text, houseTerms)) return "Best with extra space";
  if (containsAny(text, apartmentTerms)) return "Works well in apartments";
  return "Flexible for most home setups";
}

function inferBaseBudget(pet: Pet, energyLabel: string, careLabel: string) {
  const type = pet.type.toLowerCase();
  let min = 80;
  let max = 170;

  if (type.includes("dog")) {
    min = 120;
    max = 250;
  } else if (type.includes("cat")) {
    min = 70;
    max = 150;
  } else if (type.includes("rabbit")) {
    min = 60;
    max = 135;
  }

  if (energyLabel === "High") {
    min += 25;
    max += 45;
  }

  if (careLabel === "High") {
    min += 35;
    max += 80;
  }

  return { min, max };
}

function getBioSignalScore(bioText: string, petText: string) {
  let score = 0;

  if (
    containsAny(bioText, ["apartment", "condo", "small space"]) &&
    containsAny(petText, apartmentTerms)
  ) {
    score += 8;
  }

  if (
    containsAny(bioText, ["yard", "house", "outdoor", "hiking", "running"]) &&
    containsAny(petText, energeticTerms)
  ) {
    score += 10;
  }

  if (
    containsAny(bioText, ["family", "kids", "children"]) &&
    containsAny(petText, familyTerms)
  ) {
    score += 8;
  }

  if (
    containsAny(bioText, ["cat", "dog", "pets", "multi-pet"]) &&
    containsAny(petText, petFriendlyTerms)
  ) {
    score += 6;
  }

  if (
    containsAny(bioText, ["first time", "beginner", "new adopter"]) &&
    containsAny(petText, ["gentle", "calm", "friendly", "easygoing"])
  ) {
    score += 8;
  }

  return score;
}

function buildReasons(text: string, livingFit: string) {
  const reasons = [livingFit];

  if (containsAny(text, familyTerms))
    reasons.push("Signals good family potential");
  if (containsAny(text, petFriendlyTerms)) {
    reasons.push("Looks promising for a multi-pet home");
  }
  if (containsAny(text, calmTerms))
    reasons.push("Lower-intensity daily rhythm");
  if (containsAny(text, energeticTerms)) {
    reasons.push("Strong upside if you want an active companion");
  }

  return reasons.slice(0, 4);
}

function buildBestFor(text: string, energyLabel: string, careLabel: string) {
  const bestFor = [];

  if (energyLabel === "High") {
    bestFor.push("Active adopters with a consistent enrichment routine");
  } else if (energyLabel === "Low") {
    bestFor.push("Calmer homes that value predictable routines");
  } else {
    bestFor.push("Households that want a balanced daily rhythm");
  }

  if (containsAny(text, familyTerms))
    bestFor.push("Families looking for a friendly companion");
  if (containsAny(text, petFriendlyTerms))
    bestFor.push("Homes with existing pets and a slow intro plan");
  if (careLabel === "Low")
    bestFor.push("First-time adopters who want a simpler care load");
  if (careLabel === "High")
    bestFor.push("Adopters ready for extra medical or grooming follow-through");

  return bestFor.slice(0, 4);
}

function buildWatchouts(text: string, energyLabel: string, careLabel: string) {
  const watchouts = [];

  if (energyLabel === "High") {
    watchouts.push(
      "Without enough exercise, behavior can drift toward frustration or restlessness.",
    );
  }

  if (careLabel === "High") {
    watchouts.push(
      "Expect added follow-up around grooming, training, or medical tracking.",
    );
  }

  if (containsAny(text, ["shy", "nervous", "anxious"])) {
    watchouts.push(
      "Plan for a slower decompression window and fewer visitors at first.",
    );
  }

  if (containsAny(text, ["bonded", "other pets"])) {
    watchouts.push(
      "Ask the shelter exactly how introductions have gone in multi-pet settings.",
    );
  }

  if (watchouts.length === 0) {
    watchouts.push(
      "The main risk is moving too fast before routines and home expectations are aligned.",
    );
  }

  return watchouts.slice(0, 4);
}

function buildChecklist(pet: Pet, energyLabel: string, careLabel: string) {
  const text = normalizePetText(pet);
  const checklist = [
    "Confirm daily care coverage for mornings, evenings, and travel days.",
    "Set aside the first month budget for food, supplies, and vet intake.",
    "Prepare a quiet decompression area before pickup day.",
  ];

  if (energyLabel === "High") {
    checklist.push("Plan 60+ minutes of walks, play, or enrichment most days.");
  } else {
    checklist.push("Plan a calm routine with consistent mealtimes and rest.");
  }

  if (careLabel === "High") {
    checklist.push(
      "Ask about medication, grooming cadence, or training follow-up.",
    );
  }

  if (containsAny(text, familyTerms)) {
    checklist.push(
      "Align household rules so every family member handles the pet consistently.",
    );
  }

  if (containsAny(text, petFriendlyTerms)) {
    checklist.push("Prepare a slow introduction plan for existing pets.");
  }

  return checklist.slice(0, 6);
}

function buildQuestions(pet: Pet, energyLabel: string, careLabel: string) {
  const questions = [
    `What does ${pet.name}'s ideal first week in a new home look like?`,
    "What routines already help this pet feel safe and settled?",
    "Are there behavior triggers or training goals I should prepare for?",
  ];

  if (energyLabel === "High") {
    questions.push(
      "How much structured exercise has this pet done successfully?",
    );
  }

  if (careLabel === "High") {
    questions.push(
      "What medical, grooming, or follow-up care costs should I expect?",
    );
  }

  questions.push(
    "Can I meet the pet in the environment where they behave most naturally?",
  );
  return questions.slice(0, 5);
}

function buildStarterKit(pet: Pet, energyLabel: string, careLabel: string) {
  const type = pet.type.toLowerCase();
  const kit = [];

  if (type.includes("dog")) {
    kit.push("Leash, harness, waste bags, and a chew/enrichment rotation");
  } else if (type.includes("cat")) {
    kit.push("Litter setup, scratching surface, hiding spot, and carrier");
  } else {
    kit.push(
      "Species-specific bedding, feeding setup, and safe enclosure basics",
    );
  }

  if (energyLabel === "High") {
    kit.push("Two or three high-value enrichment options ready on day one");
  }

  if (careLabel === "High") {
    kit.push(
      "Medication, grooming, or follow-up care supplies sorted before pickup",
    );
  }

  kit.push(
    "A quiet decompression zone and one comfort item from the shelter if possible",
  );
  return kit.slice(0, 4);
}

function buildTimeline(pet: Pet, user: AppUser) {
  return [
    `Today: compare ${pet.name} against the rest of your shortlist and pick your top two.`,
    `Next 48 hours: contact ${pet.shelterName || "the shelter"} with your fit and care questions.`,
    "This week: schedule a visit, confirm transport, and prep supplies before committing.",
    user.bio
      ? "Before adoption day: align your routine and household rules with the shelter’s guidance."
      : "Before adoption day: finish your profile bio so the shelter gets better context about your home.",
  ];
}

function buildMonthlyTime(energyLabel: string, careLabel: string) {
  if (energyLabel === "High" && careLabel === "High")
    return "45-65 hrs / month";
  if (energyLabel === "High" || careLabel === "High")
    return "32-48 hrs / month";
  if (energyLabel === "Low" && careLabel === "Low") return "18-28 hrs / month";
  return "24-36 hrs / month";
}

function buildTransitionTempo(text: string) {
  if (containsAny(text, ["shy", "nervous", "anxious", "special needs"])) {
    return "Plan for a slow two- to three-week settling period";
  }
  if (containsAny(text, ["friendly", "outgoing", "playful", "gentle"])) {
    return "Likely to settle faster with structure and predictable contact";
  }
  return "Expect a moderate adjustment period while routines lock in";
}

function buildHomeSetupSummary(text: string, livingFit: string) {
  if (containsAny(text, ["apartment", "indoor"])) {
    return "Smaller spaces can work if routine, enrichment, and quiet rest areas are intentional.";
  }
  if (containsAny(text, ["yard", "outdoors", "working dog"])) {
    return "More space helps, but what matters most is consistent activity and decompression structure.";
  }
  return `${livingFit}. Focus less on perfect square footage and more on routine quality.`;
}

function buildProfileBoost(user: AppUser, pet: Pet) {
  if (!user.bio) {
    return `Add a short bio explaining why ${pet.name} fits your home, schedule, and experience level.`;
  }
  if (!user.dob) {
    return "Finish the remaining profile basics so your shelter outreach feels complete and credible.";
  }
  return `Use your profile details to send a concise, specific interest note for ${pet.name}.`;
}

function buildOutreachNote(user: AppUser, pet: Pet, livingFit: string) {
  const name = user.name?.split(" ")[0] || "Hi";
  return `${name} — I’m interested in ${pet.name}. My home setup seems aligned with a profile that ${livingFit.toLowerCase()}, and I’m preparing for the care routine before reaching out. I’d like to ask a few fit and transition questions before scheduling a visit.`;
}

function buildSummary(
  pet: Pet,
  energyLabel: string,
  careLabel: string,
  livingFit: string,
  confidence: string,
) {
  return `${pet.name} looks like a ${confidence.toLowerCase()} shortlist option. Expect ${energyLabel.toLowerCase()} energy, ${careLabel.toLowerCase()}-to-moderate care demands, and a home fit that ${livingFit.toLowerCase()}.`;
}

function progressTone(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

function metricLabel(score: number) {
  if (score >= 85) return "Ready";
  if (score >= 70) return "Close";
  return "Needs prep";
}

function buildInsights(user: AppUser, swipes: Swipe[], likedSwipes: Swipe[]) {
  const bioText = (user.bio ?? "").toLowerCase();
  const likedCount = likedSwipes.length;
  const totalSwipes = swipes.length;
  const nameBonus = user.name ? 6 : 0;
  const dobBonus = user.dob ? 4 : 0;
  const bioBonus = user.bio
    ? Math.min(12, Math.floor(user.bio.length / 18))
    : 0;
  const swipeBonus = Math.min(10, totalSwipes);
  const shortlistBonus = Math.min(8, likedCount * 2);

  return likedSwipes
    .map((swipe, index) => {
      const pet = swipe.pet;
      const petText = normalizePetText(pet);
      const energyLabel = getEnergyLabel(petText);
      const careLabel = getCareLabel(petText);
      const livingFit = getLivingFit(petText);
      const budget = inferBaseBudget(pet, energyLabel, careLabel);
      const bioSignalScore = getBioSignalScore(bioText, petText);
      const behaviorSignal = containsAny(petText, [
        "friendly",
        "sweet",
        "gentle",
      ])
        ? 6
        : containsAny(petText, ["shy", "anxious"])
          ? 2
          : 4;
      const careFeasibility =
        careLabel === "High" ? 13 : careLabel === "Medium" ? 17 : 21;
      const profileStrength = Math.min(26, 8 + nameBonus + dobBonus + bioBonus);
      const decisionMomentum = Math.min(18, 8 + swipeBonus + shortlistBonus);

      const compatibilityScore = Math.max(
        58,
        Math.min(
          97,
          60 + bioSignalScore + behaviorSignal + Math.min(9, likedCount * 2),
        ),
      );

      const readinessScore = Math.max(
        42,
        Math.min(
          98,
          45 + nameBonus + dobBonus + bioBonus + swipeBonus + shortlistBonus,
        ),
      );

      const confidence =
        compatibilityScore >= 86
          ? "Strong"
          : compatibilityScore >= 75
            ? "Promising"
            : "Worth exploring";

      return {
        pet,
        shortlistRank: index + 1,
        likedAt: swipe.swipedAt,
        compatibilityScore,
        readinessScore,
        budgetMin: budget.min,
        budgetMax: budget.max,
        energyLabel,
        careLabel,
        livingFit,
        confidence,
        summary: buildSummary(
          pet,
          energyLabel,
          careLabel,
          livingFit,
          confidence,
        ),
        monthlyTime: buildMonthlyTime(energyLabel, careLabel),
        transitionTempo: buildTransitionTempo(petText),
        homeSetupSummary: buildHomeSetupSummary(petText, livingFit),
        profileBoost: buildProfileBoost(user, pet),
        outreachNote: buildOutreachNote(user, pet, livingFit),
        bestFor: buildBestFor(petText, energyLabel, careLabel),
        reasons: buildReasons(petText, livingFit),
        watchouts: buildWatchouts(petText, energyLabel, careLabel),
        checklist: buildChecklist(pet, energyLabel, careLabel),
        starterKit: buildStarterKit(pet, energyLabel, careLabel),
        questions: buildQuestions(pet, energyLabel, careLabel),
        timeline: buildTimeline(pet, user),
        metrics: [
          { label: "Profile strength", value: `${profileStrength}/26` },
          { label: "Lifestyle alignment", value: `${12 + bioSignalScore}/22` },
          { label: "Care feasibility", value: `${careFeasibility}/21` },
          { label: "Decision momentum", value: `${decisionMomentum}/18` },
        ],
      } satisfies PetInsights;
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .map((item, index) => ({
      ...item,
      shortlistRank: index + 1,
    }));
}

const AdoptionPlannerPage: NextPage = () => {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useUser();
  const { data, error, isLoading } = useSWR<PlannerData>(
    authUser ? "adoption-planner" : null,
    fetchPlannerData,
  );
  const [selectedPetId, setSelectedPetId] = useState("");
  const [compatPage, setCompatPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  const insights = useMemo(
    () => (data ? buildInsights(data.user, data.swipes, data.likedSwipes) : []),
    [data],
  );
  const topInsightId = insights[0]?.pet.id ?? "";
  const compatPageCount = Math.max(
    1,
    Math.ceil(insights.length / COMPAT_PAGE_SIZE),
  );

  useEffect(() => {
    if (!selectedPetId && topInsightId) {
      setSelectedPetId(topInsightId);
    }
  }, [selectedPetId, topInsightId]);

  useEffect(() => {
    setCompatPage((page) => Math.min(page, compatPageCount));
  }, [compatPageCount]);

  const pagedInsights = useMemo(() => {
    const start = (compatPage - 1) * COMPAT_PAGE_SIZE;
    return insights.slice(start, start + COMPAT_PAGE_SIZE);
  }, [compatPage, insights]);

  const pagedIdsKey = pagedInsights.map((item) => item.pet.id).join("|");
  const pagedFirstId = pagedInsights[0]?.pet.id ?? "";

  useEffect(() => {
    if (!pagedIdsKey) return;
    const hasSelectedOnPage = pagedInsights.some(
      (item) => item.pet.id === selectedPetId,
    );
    if (!hasSelectedOnPage && pagedFirstId) {
      setSelectedPetId(pagedFirstId);
    }
  }, [pagedIdsKey, pagedFirstId, pagedInsights, selectedPetId]);

  const selectedInsight =
    insights.find((entry) => entry.pet.id === selectedPetId) ??
    pagedInsights[0];

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (!authUser) return null;

  if (error) {
    return (
      <Layout>
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
          <Card className="w-full border-red-200">
            <CardContent className="space-y-4 p-8 text-center">
              <h1 className="text-2xl font-bold text-[#234851]">
                Planner unavailable
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300">
                The adoption planner could not load your shortlist right now.
              </p>
              <Button
                className="bg-[#7097A8] text-white hover:bg-[#5f868d]"
                onClick={() => router.reload()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!data || insights.length === 0) {
    return (
      <Layout>
        <Head>
          <title>Adoption Planner | PetSwipe</title>
        </Head>

        <div className="mx-auto max-w-4xl px-6 py-12">
          <Card className="overflow-hidden border-0 shadow-xl">
            <CardContent className="bg-gradient-to-br from-[#234851] via-[#30575d] to-[#8bb6b0] px-8 py-14 text-white">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-black tracking-tight">
                  Build your shortlist first
                </h1>
                <p className="mt-4 text-base text-white/85">
                  The planner becomes useful once you like a few pets. Swipe
                  through the deck, save your favorites, then return here for
                  side-by-side comparison and adoption prep.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    className="bg-white text-[#234851] hover:bg-white/90"
                    onClick={() => router.push("/home")}
                  >
                    Start swiping
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/40 bg-transparent text-white hover:bg-white/10"
                    onClick={() => router.push("/liked-swipes")}
                  >
                    View liked pets
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const profileFieldsCompleted = [
    Boolean(data.user.name),
    Boolean(data.user.dob),
    Boolean(data.user.bio),
  ].filter(Boolean).length;
  const plannerConfidence = Math.round(
    insights.reduce((sum, item) => sum + item.compatibilityScore, 0) /
      insights.length,
  );

  return (
    <Layout>
      <Head>
        <title>Adoption Planner | PetSwipe</title>
      </Head>

      <div className="overflow-hidden bg-transparent">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]"
          >
            <Card className="overflow-hidden border-0 shadow-[0_24px_70px_rgba(35,72,81,0.18)]">
              <CardContent className="bg-gradient-to-br from-[#234851] via-[#2c5a61] to-[#6f97a8] px-8 py-9 text-white">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
                      <Sparkles className="h-4 w-4" />
                      Decision support for your liked pets
                    </div>
                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                      Adoption Planner
                    </h1>
                    <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                      Compare your shortlist in focused sets of four, sharpen
                      your questions, and walk into the shelter conversation
                      with an actual plan instead of a vague favorite.
                    </p>
                  </div>

                  <div className="grid min-w-[260px] gap-3 rounded-3xl bg-white/10 p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/75">
                        Shortlist confidence
                      </span>
                      <span className="text-2xl font-bold">
                        {plannerConfidence}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[#B6EBE9]"
                        style={{ width: `${plannerConfidence}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/75">
                      Built from profile completeness, swipe momentum, and care
                      fit signals in your current shortlist.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="border border-white/60 bg-white/85 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Liked pets
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {data.likedSwipes.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/85 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Profile complete
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {profileFieldsCompleted}/3
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/85 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <BadgeCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Total swipes logged
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {data.swipes.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="mt-8 grid gap-8 xl:grid-cols-[1.22fr_0.78fr]"
          >
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/82 p-5 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#234851] dark:text-white">
                      Compare your favorites
                    </h2>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      Four cards per page so you can make sharper comparisons
                      without scanning an endless list.
                    </p>
                  </div>
                  <div className="flex flex-nowrap items-center gap-2 self-start rounded-full border border-[#C6D9DE] bg-white/90 px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
                    <div className="rounded-full bg-[#EDF6F3] px-3 py-1.5 text-sm font-semibold tracking-[0.02em] text-[#234851] whitespace-nowrap dark:bg-slate-800 dark:text-[#B6EBE9]">
                      {compatPage} / {compatPageCount}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-full border-[#7097A8] p-0 text-[#234851] shadow-sm transition hover:bg-[#EDF6F3] dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                      onClick={() =>
                        setCompatPage((page) => Math.max(1, page - 1))
                      }
                      disabled={compatPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-full border-[#7097A8] p-0 text-[#234851] shadow-sm transition hover:bg-[#EDF6F3] dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                      onClick={() =>
                        setCompatPage((page) =>
                          Math.min(compatPageCount, page + 1),
                        )
                      }
                      disabled={compatPage === compatPageCount}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {pagedInsights.map((item) => {
                    const isSelected = item.pet.id === selectedInsight.pet.id;

                    return (
                      <button
                        key={item.pet.id}
                        type="button"
                        onClick={() => setSelectedPetId(item.pet.id)}
                        className={`text-left transition duration-200 ${
                          isSelected
                            ? "scale-[1.01]"
                            : "hover:-translate-y-1 hover:shadow-xl"
                        }`}
                      >
                        <Card
                          className={`h-full overflow-hidden border shadow-lg ${
                            isSelected
                              ? "border-[#7097A8] ring-2 ring-[#7097A8]/30"
                              : "border-white/70 dark:border-slate-800"
                          }`}
                        >
                          <div className="relative h-56 bg-[#EDF6F3] dark:bg-slate-800">
                            {item.pet.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.pet.photoUrl}
                                alt={item.pet.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#234851] dark:text-[#B6EBE9]">
                                <PawPrint className="h-14 w-14" />
                              </div>
                            )}
                            <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-[#234851] shadow-sm">
                              {item.confidence}
                            </div>
                            <div className="absolute right-4 top-4 rounded-full bg-[#234851] px-3 py-1 text-sm font-semibold text-white">
                              #{item.shortlistRank}
                            </div>
                          </div>

                          <CardContent className="space-y-4 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-bold text-[#234851] dark:text-white">
                                  {item.pet.name}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {item.pet.type} at {item.pet.shelterName}
                                </p>
                              </div>
                              <div className="rounded-full bg-[#EDF6F3] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                                {new Date(item.likedAt).toLocaleDateString(
                                  undefined,
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </div>
                            </div>

                            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                              {item.summary}
                            </p>

                            <div className="space-y-3">
                              <div className="rounded-3xl border border-[#d8e7e2] bg-[#fbfefd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                                      Compatibility
                                    </div>
                                    <div className="mt-1 text-lg font-bold text-[#234851] dark:text-white">
                                      {item.compatibilityScore}%
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-[#E9F5F2] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                                    {item.confidence}
                                  </span>
                                </div>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#dfe9e6] dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full ${progressTone(item.compatibilityScore)}`}
                                    style={{
                                      width: `${item.compatibilityScore}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="rounded-3xl border border-[#d8e7e2] bg-[#fbfefd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                                      Readiness
                                    </div>
                                    <div className="mt-1 text-lg font-bold text-[#234851] dark:text-white">
                                      {item.readinessScore}%
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                                    {metricLabel(item.readinessScore)}
                                  </span>
                                </div>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#dfe9e6] dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full ${progressTone(item.readinessScore)}`}
                                    style={{ width: `${item.readinessScore}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-2xl bg-[#F6FBF9] px-3 py-3 text-sm text-[#234851] dark:bg-slate-800 dark:text-white">
                                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                                  Budget
                                </div>
                                <div className="mt-1 font-semibold">
                                  ${item.budgetMin} - ${item.budgetMax}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-[#F6FBF9] px-3 py-3 text-sm text-[#234851] dark:bg-slate-800 dark:text-white">
                                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                                  Time
                                </div>
                                <div className="mt-1 font-semibold">
                                  {item.monthlyTime}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {[
                                item.energyLabel,
                                `${item.careLabel} care`,
                                item.livingFit,
                              ].map((badge) => (
                                <span
                                  key={badge}
                                  className="rounded-full bg-[#EDF6F3] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center pt-1">
                  <Button
                    variant="outline"
                    className="border-[#7097A8] text-[#234851] hover:bg-[#EDF6F3] dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                    onClick={() => router.push("/liked-swipes")}
                  >
                    Open liked pets
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden border border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(35,72,81,0.12)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardHeader className="space-y-4 border-b border-black/5 pb-5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-[#234851] dark:text-white">
                        {selectedInsight.pet.name} plan
                      </CardTitle>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {metricLabel(selectedInsight.readinessScore)} for
                        next-step outreach
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                        <Wallet className="h-4 w-4" />
                        Monthly budget
                      </div>
                      <p className="mt-2 text-2xl font-bold text-[#234851] dark:text-white">
                        ${selectedInsight.budgetMin} - $
                        {selectedInsight.budgetMax}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                        <Clock3 className="h-4 w-4" />
                        Monthly time
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[#234851] dark:text-white">
                        {selectedInsight.monthlyTime}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-3xl border border-[#d8e7e2] bg-[#fbfefd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                            Compatibility
                          </div>
                          <div className="mt-1 text-2xl font-bold text-[#234851] dark:text-white">
                            {selectedInsight.compatibilityScore}%
                          </div>
                        </div>
                        <span className="rounded-full bg-[#E9F5F2] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                          {selectedInsight.confidence}
                        </span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dfe9e6] dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${progressTone(selectedInsight.compatibilityScore)}`}
                          style={{
                            width: `${selectedInsight.compatibilityScore}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#d8e7e2] bg-[#fbfefd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                            Readiness
                          </div>
                          <div className="mt-1 text-2xl font-bold text-[#234851] dark:text-white">
                            {selectedInsight.readinessScore}%
                          </div>
                        </div>
                        <span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                          {metricLabel(selectedInsight.readinessScore)}
                        </span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#dfe9e6] dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${progressTone(selectedInsight.readinessScore)}`}
                          style={{
                            width: `${selectedInsight.readinessScore}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedInsight.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-neutral-200 p-4 dark:border-slate-800"
                      >
                        <div className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                          {metric.label}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-[#234851] dark:text-white">
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Why this pet is near the top
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedInsight.reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-[#234851] px-3 py-1 text-sm font-medium text-white"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-[#EDF6F3] p-5 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                        <Home className="h-4 w-4" />
                        Home fit
                      </div>
                      <p className="mt-3 text-lg font-semibold text-[#234851] dark:text-white">
                        {selectedInsight.livingFit}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                        {selectedInsight.homeSetupSummary}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-[#EDF6F3] p-5 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                        <TimerReset className="h-4 w-4" />
                        Transition tempo
                      </div>
                      <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                        {selectedInsight.transitionTempo}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[#234851] dark:text-white">
                        Shortlist rank: #{selectedInsight.shortlistRank}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Best for
                    </h3>
                    <div className="mt-3 grid gap-3">
                      {selectedInsight.bestFor.map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-slate-800"
                        >
                          <Star className="mt-0.5 h-5 w-5 shrink-0 text-[#7097A8]" />
                          <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      className="bg-[#7097A8] text-white hover:bg-[#5f868d]"
                      onClick={() =>
                        router.push(`/pet/${selectedInsight.pet.id}`)
                      }
                    >
                      Open pet profile
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#7097A8] text-[#234851] hover:bg-[#EDF6F3] dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                      onClick={() => router.push("/profile")}
                    >
                      Strengthen my profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="mt-8 grid gap-6 xl:grid-cols-2"
          >
            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <CalendarDays className="h-5 w-5 text-[#7097A8]" />
                  Next 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedInsight.timeline.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-[#EDF6F3] p-4 text-sm leading-6 text-[#234851] dark:bg-slate-800 dark:text-neutral-200"
                  >
                    <span className="mr-2 font-bold text-[#7097A8]">
                      {index + 1}.
                    </span>
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <PhoneCall className="h-5 w-5 text-[#7097A8]" />
                  Shelter questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedInsight.questions.map((question) => (
                  <div
                    key={question}
                    className="rounded-2xl border border-neutral-200 p-4 text-sm leading-6 text-neutral-700 dark:border-slate-800 dark:text-neutral-300"
                  >
                    {question}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <HousePlus className="h-5 w-5 text-[#7097A8]" />
                  Home prep and starter kit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedInsight.starterKit.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-[#F6FBF9] p-4 text-sm leading-6 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300"
                  >
                    {item}
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-[#7097A8]/40 p-4 text-sm leading-6 text-neutral-700 dark:border-[#7097A8]/30 dark:text-neutral-300">
                  {selectedInsight.profileBoost}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <ShieldCheck className="h-5 w-5 text-[#7097A8]" />
                  Watchouts and readiness gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedInsight.watchouts.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-neutral-200 p-4 text-sm leading-6 text-neutral-700 dark:border-slate-800 dark:text-neutral-300"
                  >
                    {item}
                  </div>
                ))}
                {!data.user.bio && (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Add a short bio describing your home, schedule, and other
                    pets. That improves fit scoring immediately.
                  </div>
                )}
                {data.swipes.length < 5 && (
                  <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Keep swiping a bit longer if you need more contrast. More
                    signals help distinguish a real favorite from a quick like.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.35 }}
            className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"
          >
            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <ClipboardList className="h-5 w-5 text-[#7097A8]" />
                  Readiness checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedInsight.checklist.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-slate-800"
                  >
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#7097A8]" />
                    <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      {item}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/60 bg-white/82 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/82">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <MessageSquareQuote className="h-5 w-5 text-[#7097A8]" />
                  Suggested outreach note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[28px] bg-[#234851] p-6 text-sm leading-7 text-white shadow-inner">
                  {selectedInsight.outreachNote}
                </div>
                <div className="rounded-2xl bg-[#F6FBF9] p-5 text-sm leading-6 text-neutral-700 dark:bg-slate-800 dark:text-neutral-300">
                  <p className="font-semibold text-[#234851] dark:text-white">
                    Current best pick
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#234851] dark:text-white">
                    {selectedInsight.pet.name}
                  </p>
                  <p className="mt-2">{selectedInsight.summary}</p>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
};

export default AdoptionPlannerPage;
