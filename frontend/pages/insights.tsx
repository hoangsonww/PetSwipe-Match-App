import React, { useEffect, useMemo } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  Clock3,
  Compass,
  Heart,
  Layers3,
  Loader2,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useUser } from "@/hooks/useUser";
import { AppUser, Swipe, swipeApi, userApi } from "@/lib/api";

type InsightsData = {
  user: AppUser;
  swipes: Swipe[];
};

type TypeAffinity = {
  type: string;
  likes: number;
  passes: number;
  total: number;
  affinity: number;
};

type ShelterMomentum = {
  shelter: string;
  likes: number;
  passes: number;
  total: number;
  affinity: number;
};

type DailySwipes = {
  day: string;
  likes: number;
  passes: number;
  total: number;
};

const fetchInsights = async (): Promise<InsightsData> => {
  const [profile, swipes] = await Promise.all([
    userApi.getProfile(),
    swipeApi.listMySwipes(),
  ]);

  return { user: profile.user, swipes };
};

function titleCase(value: string) {
  if (!value.trim()) return "Unknown";
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortenLabel(value: string, max = 12) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}...`;
}

function buildTypeAffinity(swipes: Swipe[]): TypeAffinity[] {
  const map = new Map<string, TypeAffinity>();

  swipes.forEach((swipe) => {
    const key = titleCase(swipe.pet.type || "Unknown");
    const existing = map.get(key) ?? {
      type: key,
      likes: 0,
      passes: 0,
      total: 0,
      affinity: 0,
    };

    existing.total += 1;
    if (swipe.liked) {
      existing.likes += 1;
    } else {
      existing.passes += 1;
    }

    existing.affinity = Math.round((existing.likes / existing.total) * 100);
    map.set(key, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.likes - a.likes || b.affinity - a.affinity)
    .slice(0, 6);
}

function buildShelterMomentum(swipes: Swipe[]): ShelterMomentum[] {
  const map = new Map<string, ShelterMomentum>();

  swipes.forEach((swipe) => {
    const shelter = swipe.pet.shelterName?.trim() || "Unknown shelter";
    const existing = map.get(shelter) ?? {
      shelter,
      likes: 0,
      passes: 0,
      total: 0,
      affinity: 0,
    };

    existing.total += 1;
    if (swipe.liked) {
      existing.likes += 1;
    } else {
      existing.passes += 1;
    }

    existing.affinity = Math.round((existing.likes / existing.total) * 100);
    map.set(shelter, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.likes - a.likes || b.affinity - a.affinity)
    .slice(0, 5);
}

function buildDailySwipes(swipes: Swipe[]): DailySwipes[] {
  const formatDay = (date: Date) =>
    date.toLocaleDateString(undefined, { weekday: "short" });
  const keyForDate = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const today = new Date();
  const buckets = new Map<string, DailySwipes>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    buckets.set(keyForDate(date), {
      day: formatDay(date),
      likes: 0,
      passes: 0,
      total: 0,
    });
  }

  swipes.forEach((swipe) => {
    const date = new Date(swipe.swipedAt);
    const key = keyForDate(date);
    const bucket = buckets.get(key);

    if (!bucket) return;

    bucket.total += 1;
    if (swipe.liked) {
      bucket.likes += 1;
    } else {
      bucket.passes += 1;
    }
  });

  return Array.from(buckets.values());
}

function buildRecommendations(
  user: AppUser,
  swipes: Swipe[],
  typeAffinity: TypeAffinity[],
  shelterMomentum: ShelterMomentum[],
) {
  const recommendations: string[] = [];
  const topType = typeAffinity[0];
  const weakestType = [...typeAffinity].sort(
    (a, b) => a.affinity - b.affinity,
  )[0];
  const likeRate =
    swipes.length === 0
      ? 0
      : Math.round(
          (swipes.filter((swipe) => swipe.liked).length / swipes.length) * 100,
        );

  if (topType) {
    recommendations.push(
      `${topType.type} is your strongest signal right now with a ${topType.affinity}% like rate.`,
    );
  }

  if (weakestType && weakestType.total >= 2 && weakestType !== topType) {
    recommendations.push(
      `You consistently pass on ${weakestType.type}. Narrowing future decks around better-fit types would reduce noise.`,
    );
  }

  if (shelterMomentum[0]) {
    recommendations.push(
      `${shelterMomentum[0].shelter} appears most aligned with your preferences so far.`,
    );
  }

  if (!user.bio) {
    recommendations.push(
      "Your profile bio is still empty. Adding your home setup and routine will make planner suggestions sharper.",
    );
  }

  if (likeRate >= 60) {
    recommendations.push(
      "Your like rate is high, which usually means it is time to compare shortlist quality instead of just swiping longer.",
    );
  } else if (likeRate > 0) {
    recommendations.push(
      "Your like rate is selective enough to trust. The next leverage point is contacting shelters for your top two pets.",
    );
  }

  return recommendations.slice(0, 4);
}

function getStrongestDay(dailySwipes: DailySwipes[]) {
  return [...dailySwipes].sort(
    (a, b) => b.likes - a.likes || b.total - a.total,
  )[0];
}

function getRecentLikeRate(dailySwipes: DailySwipes[]) {
  const recent = dailySwipes.slice(-3);
  const recentTotal = recent.reduce((sum, day) => sum + day.total, 0);

  if (recentTotal === 0) return 0;

  return Math.round(
    (recent.reduce((sum, day) => sum + day.likes, 0) / recentTotal) * 100,
  );
}

function getMomentumSummary(dailySwipes: DailySwipes[]) {
  const recent = dailySwipes.slice(-3);
  const earlier = dailySwipes.slice(0, -3);
  const recentTotal = recent.reduce((sum, day) => sum + day.total, 0);
  const earlierTotal = earlier.reduce((sum, day) => sum + day.total, 0);
  const recentLikeRate =
    recentTotal === 0
      ? 0
      : Math.round(
          (recent.reduce((sum, day) => sum + day.likes, 0) / recentTotal) * 100,
        );
  const earlierLikeRate =
    earlierTotal === 0
      ? 0
      : Math.round(
          (earlier.reduce((sum, day) => sum + day.likes, 0) / earlierTotal) *
            100,
        );

  if (recentTotal === 0 && earlierTotal === 0) {
    return "No recent swipe activity yet.";
  }

  if (recentTotal > 0 && earlierTotal === 0) {
    return "Your most recent activity is setting the baseline for future preference signals.";
  }

  if (recentLikeRate >= earlierLikeRate + 10) {
    return "Recent swipes are converting better than earlier ones, which usually means your preferences are sharpening.";
  }

  if (earlierLikeRate >= recentLikeRate + 10) {
    return "Recent likes are softer than your earlier pattern, so it may be worth tightening your standards again.";
  }

  return "Your recent behavior is stable, which makes the current preference picture fairly trustworthy.";
}

function getDecisionStyle(likeRate: number) {
  if (likeRate >= 65) {
    return "You are generous with likes right now. Use the planner to rank quality instead of continuing to widen the shortlist.";
  }

  if (likeRate >= 35) {
    return "Your swipe pattern is balanced and selective enough to trust as a real preference signal.";
  }

  return "You are highly selective. That is useful, but you may want a few more likes before drawing hard conclusions.";
}

function getProfileReadiness(user: AppUser) {
  const completed = [
    Boolean(user.name),
    Boolean(user.dob),
    Boolean(user.bio),
  ].filter(Boolean).length;

  return {
    completed,
    label:
      completed === 3
        ? "Profile is ready for shelter outreach."
        : completed === 2
          ? "One more profile detail would make your outreach stronger."
          : "Your profile still needs more context to support your planner results.",
  };
}

const activityChartConfig = {
  likes: { label: "Likes", color: "#7097A8" },
  passes: { label: "Passes", color: "#D97757" },
};

const typeChartConfig = {
  affinity: { label: "Like Rate", color: "#234851" },
};

const shelterChartConfig = {
  likes: { label: "Likes", color: "#7097A8" },
};

const decisionChartConfig = {
  liked: { label: "Liked", color: "#7097A8" },
  passed: { label: "Passed", color: "#D97757" },
};

const decisionColors = ["#7097A8", "#D97757"];

const InsightsPage: NextPage = () => {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useUser();
  const { data, error, isLoading } = useSWR<InsightsData>(
    authUser ? "user-insights" : null,
    fetchInsights,
  );

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  const analytics = useMemo(() => {
    if (!data) return null;

    const liked = data.swipes.filter((swipe) => swipe.liked);
    const passed = data.swipes.filter((swipe) => !swipe.liked);
    const typeAffinity = buildTypeAffinity(data.swipes);
    const shelterMomentum = buildShelterMomentum(data.swipes);
    const dailySwipes = buildDailySwipes(data.swipes);
    const likeRate =
      data.swipes.length === 0
        ? 0
        : Math.round((liked.length / data.swipes.length) * 100);
    const topType = typeAffinity[0]?.type ?? "Not enough data";
    const recommendations = buildRecommendations(
      data.user,
      data.swipes,
      typeAffinity,
      shelterMomentum,
    );
    const activeDays = dailySwipes.filter((day) => day.total > 0).length;
    const profileReadiness = getProfileReadiness(data.user);
    const strongestDay = getStrongestDay(dailySwipes);
    const recentLikeRate = getRecentLikeRate(dailySwipes);
    const avgSwipesPerActiveDay =
      activeDays === 0 ? 0 : Math.round(data.swipes.length / activeDays);
    const plannerReadiness =
      liked.length >= 4
        ? "You have enough favorites to compare confidently inside the planner."
        : "A few more likes would make planner comparisons more robust.";

    return {
      liked,
      passed,
      typeAffinity,
      shelterMomentum,
      dailySwipes,
      likeRate,
      topType,
      recommendations,
      activeDays,
      profileReadiness,
      strongestDay,
      recentLikeRate,
      avgSwipesPerActiveDay,
      momentumSummary: getMomentumSummary(dailySwipes),
      decisionStyle: getDecisionStyle(likeRate),
      plannerReadiness,
      shelterDiversity: shelterMomentum.length,
      decisionBreakdown: [
        { name: "liked", value: liked.length },
        { name: "passed", value: passed.length },
      ],
    };
  }, [data]);

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
                Insights unavailable
              </h1>
              <p className="text-neutral-600 dark:text-neutral-300">
                Your analytics dashboard could not load right now.
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

  if (!data || !analytics || data.swipes.length === 0) {
    return (
      <Layout>
        <Head>
          <title>Insights | PetSwipe</title>
        </Head>

        <div className="mx-auto max-w-4xl px-6 py-12">
          <Card className="overflow-hidden border-0 shadow-xl">
            <CardContent className="bg-gradient-to-br from-[#234851] via-[#2e5b63] to-[#94b8b2] px-8 py-14 text-white">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-black tracking-tight">
                  Your insights will appear after a few swipes
                </h1>
                <p className="mt-4 text-base text-white/85">
                  Once you start liking and passing pets, this page turns that
                  behavior into preference trends, fit signals, and shortlist
                  guidance.
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
                    onClick={() => router.push("/adoption-planner")}
                  >
                    Open planner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Insights | PetSwipe</title>
      </Head>

      <div className="overflow-hidden bg-transparent">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]"
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              <CardContent className="bg-[#234851] px-8 py-9 text-white">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
                      <Sparkles className="h-4 w-4" />
                      Behavior-backed adoption analytics
                    </div>
                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                      Preference Insights
                    </h1>
                    <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                      See what your swipe history actually says about your
                      adoption preferences, not just what feels right in the
                      moment.
                    </p>
                  </div>

                  <div className="grid min-w-[240px] gap-3 rounded-3xl bg-white/10 p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/75">Like rate</span>
                      <span className="text-2xl font-bold">
                        {analytics.likeRate}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[#B6EBE9]"
                        style={{ width: `${analytics.likeRate}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/75">
                      Top preference currently points toward{" "}
                      {analytics.topType.toLowerCase()}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <Card className="border border-white/60 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <PawPrint className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Total swipes
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {data.swipes.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Pets liked
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {analytics.liked.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Top type
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {analytics.topType}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-2xl bg-[#EDF6F3] p-3 text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                    <Layers3 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Shelter spread
                    </p>
                    <p className="text-2xl font-bold text-[#234851] dark:text-white">
                      {analytics.shelterDiversity}
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
            className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
          >
            <Card className="min-w-0 border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <TrendingUp className="h-5 w-5 text-[#7097A8]" />
                  7-day swipe activity
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
                <ChartContainer
                  config={activityChartConfig}
                  className="h-[260px] w-full sm:h-[320px]"
                >
                  <AreaChart data={analytics.dailySwipes}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Area
                      dataKey="likes"
                      type="monotone"
                      fill="var(--color-likes)"
                      fillOpacity={0.28}
                      stroke="var(--color-likes)"
                      strokeWidth={2}
                    />
                    <Area
                      dataKey="passes"
                      type="monotone"
                      fill="var(--color-passes)"
                      fillOpacity={0.14}
                      stroke="var(--color-passes)"
                      strokeWidth={2}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0 border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <Compass className="h-5 w-5 text-[#7097A8]" />
                  Decision split
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
                <ChartContainer
                  config={decisionChartConfig}
                  className="mx-auto h-[300px] w-full max-w-[280px] sm:h-[340px] sm:max-w-[320px]"
                >
                  <PieChart
                    margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent nameKey="name" />}
                    />
                    <Pie
                      data={analytics.decisionBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={5}
                    >
                      {analytics.decisionBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={decisionColors[index % decisionColors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="name" />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                      <ShieldCheck className="h-4 w-4" />
                      Decision posture
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      {analytics.decisionStyle}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#234851] dark:text-[#B6EBE9]">
                      <Clock3 className="h-4 w-4" />
                      Recent momentum
                    </div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      {analytics.momentumSummary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
          >
            <Card className="min-w-0 border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                  <BarChart3 className="h-5 w-5 text-[#7097A8]" />
                  Pet type affinity
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
                <ChartContainer
                  config={typeChartConfig}
                  className="h-[280px] w-full sm:h-[340px]"
                >
                  <BarChart
                    data={analytics.typeAffinity}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="type"
                      type="category"
                      width={72}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value: string) => shortenLabel(value, 10)}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${value}%`}
                        />
                      }
                    />
                    <Bar
                      dataKey="affinity"
                      radius={[0, 12, 12, 0]}
                      fill="var(--color-affinity)"
                    />
                  </BarChart>
                </ChartContainer>
                <div className="mt-4 space-y-3">
                  {analytics.typeAffinity.map((type) => (
                    <div
                      key={type.type}
                      className="rounded-3xl border border-[#dbe9e5] bg-white px-4 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#234851] dark:text-white">
                            {type.type}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                            {type.affinity}% affinity
                          </p>
                        </div>
                        <div className="rounded-full bg-[#EDF6F3] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                          {type.likes} likes
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl bg-[#F6FBF9] px-3 py-3 dark:bg-slate-800">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                            Seen
                          </div>
                          <div className="mt-1 font-semibold text-[#234851] dark:text-white">
                            {type.total}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-[#F6FBF9] px-3 py-3 dark:bg-slate-800">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                            Likes
                          </div>
                          <div className="mt-1 font-semibold text-[#234851] dark:text-white">
                            {type.likes}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-[#F6FBF9] px-3 py-3 dark:bg-slate-800">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                            Passes
                          </div>
                          <div className="mt-1 font-semibold text-[#234851] dark:text-white">
                            {type.passes}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="min-w-0 border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                    <BadgeCheck className="h-5 w-5 text-[#7097A8]" />
                    Signal summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Strongest day
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#234851] dark:text-white">
                      {analytics.strongestDay?.day ?? "No activity yet"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      {analytics.strongestDay
                        ? `${analytics.strongestDay.likes} likes from ${analytics.strongestDay.total} total swipes.`
                        : "Swipe activity will surface once more data arrives."}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Active days
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#234851] dark:text-white">
                      {analytics.activeDays} days this week
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      Averaging {analytics.avgSwipesPerActiveDay} swipes on the
                      days you were active.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Recent like rate
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#234851] dark:text-white">
                      {analytics.recentLikeRate}%
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      Based on the last three days of swipe behavior.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Planner readiness
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      {analytics.plannerReadiness}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                    <Building2 className="h-5 w-5 text-[#7097A8]" />
                    Shelter momentum
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.shelterMomentum.length > 0 ? (
                    <>
                      <ChartContainer
                        config={shelterChartConfig}
                        className="h-[250px] w-full"
                      >
                        <BarChart
                          data={analytics.shelterMomentum}
                          layout="vertical"
                          margin={{ left: 8, right: 8 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey="shelter"
                            type="category"
                            width={76}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value: string) =>
                              shortenLabel(value, 11)
                            }
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <Bar
                            dataKey="likes"
                            radius={[0, 12, 12, 0]}
                            fill="var(--color-likes)"
                          />
                        </BarChart>
                      </ChartContainer>
                      <div className="space-y-3">
                        {analytics.shelterMomentum.map((entry) => (
                          <div
                            key={entry.shelter}
                            className="rounded-3xl border border-neutral-200 p-4 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-semibold text-[#234851] dark:text-white">
                                {entry.shelter}
                              </span>
                              <span className="rounded-full bg-[#EDF6F3] px-3 py-1 text-xs font-semibold text-[#234851] dark:bg-slate-800 dark:text-[#B6EBE9]">
                                {entry.affinity}% fit
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                              {entry.likes} likes, {entry.passes} passes,{" "}
                              {entry.total} pets seen.
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      Like a few pets to reveal which shelters align best with
                      your taste.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 border border-white/60 bg-white/85 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#234851] dark:text-white">
                    <Sparkles className="h-5 w-5 text-[#7097A8]" />
                    What to do next
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.recommendations.map((item) => (
                    <div
                      key={item}
                      className="rounded-3xl bg-[#234851] px-4 py-4 text-sm leading-6 text-white"
                    >
                      {item}
                    </div>
                  ))}

                  <div className="rounded-3xl bg-[#F6FBF9] p-4 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      Profile readiness
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#234851] dark:text-white">
                      {analytics.profileReadiness.completed}/3 complete
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      {analytics.profileReadiness.label}
                    </p>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Button
                      className="bg-[#7097A8] text-white hover:bg-[#5f868d]"
                      onClick={() => router.push("/adoption-planner")}
                    >
                      Open planner
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#7097A8] text-[#234851] hover:bg-[#EDF6F3] dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                      onClick={() => router.push("/swipes")}
                    >
                      Review swipe history
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
};

export default InsightsPage;
