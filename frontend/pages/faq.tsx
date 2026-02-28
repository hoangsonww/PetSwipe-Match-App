import React, { useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HeartHandshake,
  LifeBuoy,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FaqCategory =
  | "Getting Started"
  | "Swiping & Matches"
  | "Listings & Shelters"
  | "Privacy & Safety"
  | "Support";

type FaqItem = {
  q: string;
  a: string;
  category: FaqCategory;
};

const faqs: FaqItem[] = [
  {
    category: "Getting Started",
    q: "What is PetSwipe?",
    a: "PetSwipe is a responsive adoption platform that helps prospective adopters discover shelter pets, learn about them quickly, and keep track of the pets they are genuinely interested in.",
  },
  {
    category: "Getting Started",
    q: "How do I start swiping?",
    a: "Create an account, log in, and open your pet deck. From there, you can swipe right to save a pet you are interested in or left to pass, and your choices are stored right away.",
  },
  {
    category: "Swiping & Matches",
    q: "Can I change my mind after swiping?",
    a: "Not currently. PetSwipe is designed to encourage thoughtful choices, so each swipe is treated as intentional. If you are unsure, take a moment to review the pet details before deciding.",
  },
  {
    category: "Listings & Shelters",
    q: "How do I add my own pet for adoption?",
    a: "Use the Add Pet flow from the navbar, enter the pet details, upload photos, and submit the listing. Once saved, other users can discover that pet in their browsing flow.",
  },
  {
    category: "Listings & Shelters",
    q: "How do I get the pet I swiped right on?",
    a: "Open your liked pets page or Adoption Planner. Those views help you review your shortlist and remind you to contact the shelter or foster directly to complete the real adoption process.",
  },
  {
    category: "Getting Started",
    q: "Do I need to be logged in to browse pets?",
    a: "Yes. An account lets PetSwipe save your swipes, personalize your deck, protect your listings, and keep your adoption activity connected to your profile.",
  },
  {
    category: "Listings & Shelters",
    q: "Where do the pet photos come from?",
    a: "Photos are uploaded by shelter staff, fosters, or other authorized listers when they create or manage a pet profile. The app stores those images in cloud storage for reliable delivery.",
  },
  {
    category: "Privacy & Safety",
    q: "Is my personal data safe?",
    a: "PetSwipe stores only the information needed to run your account and adoption workflow. Authentication uses secure session handling, and passwords are stored as hashes rather than plain text.",
  },
  {
    category: "Getting Started",
    q: "Can I browse on my phone?",
    a: "Yes. The app is mobile responsive and the swipe flow is touch friendly, so you can browse, review likes, open the planner, and check insights from your phone.",
  },
  {
    category: "Swiping & Matches",
    q: "How do I view pets I’ve liked?",
    a: "Go to the liked pets page from the navbar. You can also open the Adoption Planner to compare your liked pets, review readiness signals, and prepare questions before contacting the shelter.",
  },
  {
    category: "Support",
    q: "What if I encounter a bug?",
    a: "If something looks broken, contact support with the page, device, and a short description of what happened. The more specific the report, the faster the issue can be reproduced and fixed.",
  },
  {
    category: "Swiping & Matches",
    q: "Can I filter pets by type?",
    a: "The app continues to expand filtering and decision-support tools. Today, your activity and saved pets already feed pages like Insights and the Adoption Planner so you can narrow choices more effectively.",
  },
  {
    category: "Listings & Shelters",
    q: "How often is the pet list updated?",
    a: "Listings update as shelters and users add, edit, or remove pets. The app is designed so active listings can be refreshed quickly without waiting for a manual site-wide update cycle.",
  },
];

const categories: Array<"All" | FaqCategory> = [
  "All",
  "Getting Started",
  "Swiping & Matches",
  "Listings & Shelters",
  "Privacy & Safety",
  "Support",
];

const categoryAccent: Record<FaqCategory, string> = {
  "Getting Started":
    "border-[#9dd8d4] bg-[#ecfbf7] text-[#1d5a59] dark:border-[#376b69] dark:bg-[#112527] dark:text-[#b9f2ec]",
  "Swiping & Matches":
    "border-[#b8c7ff] bg-[#eef1ff] text-[#384a93] dark:border-[#4b5ca1] dark:bg-[#161d35] dark:text-[#ced7ff]",
  "Listings & Shelters":
    "border-[#ffd7a1] bg-[#fff4df] text-[#9c6115] dark:border-[#8b5f22] dark:bg-[#2e2110] dark:text-[#ffe2b4]",
  "Privacy & Safety":
    "border-[#c2efc8] bg-[#edf9ef] text-[#2a7041] dark:border-[#49795a] dark:bg-[#14241a] dark:text-[#cbf6d5]",
  Support:
    "border-[#f3c1d6] bg-[#fff0f7] text-[#93456d] dark:border-[#844d67] dark:bg-[#2d1622] dark:text-[#ffd1e6]",
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

const FAQ: NextPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | FaqCategory>(
    "All",
  );

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((item) => {
      const categoryMatch =
        activeCategory === "All" || item.category === activeCategory;
      const textMatch =
        normalizedQuery.length === 0 ||
        item.q.toLowerCase().includes(normalizedQuery) ||
        item.a.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);

      return categoryMatch && textMatch;
    });
  }, [activeCategory, query]);

  const featuredQuestions = faqs.slice(0, 3);

  return (
    <Layout>
      <Head>
        <title>FAQs | PetSwipe</title>
      </Head>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6rem] top-10 h-56 w-56 rounded-full bg-[#d9f5f1] blur-3xl dark:bg-[#163032]" />
          <div className="absolute right-[-4rem] top-24 h-64 w-64 rounded-full bg-[#e8eefc] blur-3xl dark:bg-[#171d31]" />
          <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-[#fff2d9] blur-3xl dark:bg-[#302110]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-[2rem] border border-white/70 bg-white/85 p-7 shadow-[0_24px_80px_-40px_rgba(35,72,81,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#0f172acc]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border-[#9dd8d4] bg-[#ecfbf7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1d5a59] dark:border-[#376b69] dark:bg-[#12292a] dark:text-[#b8f2ec]">
                  Help Center
                </Badge>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e9e7] bg-white/80 px-3 py-1 text-xs font-medium text-[#4d6d73] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-[#c8d7da]">
                  <HeartHandshake className="h-3.5 w-3.5 text-[#2c7a7b]" />
                  Adoption guidance with real next steps
                </div>
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[#18353d] dark:text-white sm:text-5xl">
                Frequently asked questions, styled like an actual support hub.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#58747a] dark:text-[#c5d0d3] sm:text-lg">
                Search answers, jump between topics, and get pointed back to the
                right part of PetSwipe faster, whether you are browsing pets,
                reviewing your likes, or preparing to contact a shelter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c8890] dark:text-[#9fb3b9]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by question, adoption topic, or keyword"
                    className="h-12 rounded-2xl border-[#cde5e1] bg-white/90 pl-11 text-sm shadow-sm focus-visible:ring-[#6aa8a1] dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("All");
                  }}
                  className="h-12 rounded-2xl border-[#cde5e1] bg-white/80 px-5 text-[#234851] hover:bg-[#edf7f5] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Reset
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Sparkles,
                    label: "Answers available",
                    value: `${faqs.length}`,
                    tone: "from-[#e9fbf7] to-white text-[#205655] dark:from-[#122728] dark:to-[#0f172a] dark:text-[#b8f1ea]",
                  },
                  {
                    icon: ShieldCheck,
                    label: "Core support topics",
                    value: `${categories.length - 1}`,
                    tone: "from-[#eef2ff] to-white text-[#34428e] dark:from-[#171d35] dark:to-[#0f172a] dark:text-[#d2dbff]",
                  },
                  {
                    icon: PawPrint,
                    label: "Goal",
                    value: "Responsible adoption",
                    tone: "from-[#fff4df] to-white text-[#99631f] dark:from-[#2c200f] dark:to-[#0f172a] dark:text-[#ffe2b3]",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border border-white/70 bg-gradient-to-br p-4 shadow-sm ${stat.tone}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/80 p-2 dark:bg-white/10">
                        <stat.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="space-y-4"
            >
              <Card className="rounded-[1.75rem] border-white/70 bg-[#234851] text-white shadow-[0_22px_70px_-44px_rgba(17,24,39,0.85)] dark:border-white/10 dark:bg-[#13252f]">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <LifeBuoy className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">
                        What this page helps with
                      </CardTitle>
                      <CardDescription className="text-white/75">
                        Designed to answer product questions quickly.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/90">
                  {[
                    "Learn how likes, swipes, and added pets work.",
                    "Understand what happens after you save a pet.",
                    "Find the right page when you need planner or insights help.",
                  ].map((line) => (
                    <div
                      key={line}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      {line}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-[#d8e8e5] bg-white/85 shadow-[0_18px_60px_-42px_rgba(35,72,81,0.55)] backdrop-blur dark:border-white/10 dark:bg-[#111827cc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#1a3740] dark:text-white">
                    Popular starting points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {featuredQuestions.map((item) => (
                    <button
                      key={item.q}
                      type="button"
                      onClick={() => {
                        setActiveCategory(item.category);
                        setQuery(item.q);
                      }}
                      className="w-full rounded-2xl border border-[#dbe8e5] bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#91c8c3] hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-[#4f8280]"
                    >
                      <p className="text-sm font-semibold text-[#1f4650] dark:text-white">
                        {item.q}
                      </p>
                      <p className="mt-1 text-xs text-[#698188] dark:text-[#a9bcc2]">
                        {item.category}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#1f5c5c] bg-[#1f5c5c] text-white shadow-lg shadow-[#1f5c5c]/20 dark:border-[#95ddd6] dark:bg-[#95ddd6] dark:text-[#0f172a]"
                      : "border-[#cfe4e1] bg-white/80 text-[#365860] hover:border-[#9ecdc8] hover:bg-[#eef8f6] dark:border-white/10 dark:bg-white/5 dark:text-[#d2dde0] dark:hover:bg-white/10"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_-50px_rgba(35,72,81,0.5)] backdrop-blur dark:border-white/10 dark:bg-[#0f172acc] sm:p-6">
              <div className="flex flex-col gap-3 border-b border-[#dbeae6] pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5f7f87] dark:text-[#8ea6ac]">
                    Results
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#193841] dark:text-white">
                    {filteredFaqs.length} answer
                    {filteredFaqs.length === 1 ? "" : "s"} available
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-[#658088] dark:text-[#afc0c5]">
                  Browse by category or search by phrase. Every answer is
                  written to help users move toward a real, responsible adoption
                  next step.
                </p>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#cfe3df] bg-[#f7fbfa] px-6 py-10 text-center dark:border-white/10 dark:bg-white/5">
                  <Search className="h-10 w-10 text-[#6b8b91] dark:text-[#97aeb4]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#234851] dark:text-white">
                    No matching answers right now
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#6a848b] dark:text-[#a9bcc2]">
                    Try a broader keyword like{" "}
                    <span className="font-semibold">swipe</span>,
                    <span className="font-semibold"> adoption</span>, or{" "}
                    <span className="font-semibold">account</span>, or reset the
                    filters to browse everything.
                  </p>
                  <Button
                    onClick={() => {
                      setQuery("");
                      setActiveCategory("All");
                    }}
                    className="mt-5 rounded-full bg-[#234851] px-5 text-white hover:bg-[#1b3941]"
                  >
                    Show all FAQs
                  </Button>
                </div>
              ) : (
                <Accordion type="single" collapsible className="mt-6 space-y-4">
                  {filteredFaqs.map((item, index) => (
                    <motion.div
                      key={item.q}
                      custom={index}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.12 }}
                      variants={itemVariants}
                    >
                      <Card className="overflow-hidden rounded-[1.5rem] border-[#d8e8e5] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#111827]">
                        <AccordionItem
                          value={item.q}
                          className="border-none px-5 py-2 sm:px-6"
                        >
                          <div className="flex items-center gap-3 pb-1 pt-3">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${categoryAccent[item.category]}`}
                            >
                              {item.category}
                            </Badge>
                          </div>
                          <AccordionTrigger className="py-3 text-left text-lg font-semibold leading-7 text-[#1c3b44] no-underline hover:no-underline dark:text-white">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="pb-5 pt-1 text-[15px] leading-7 text-[#637f87] dark:text-[#c3d1d5]">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      </Card>
                    </motion.div>
                  ))}
                </Accordion>
              )}
            </div>

            <div className="space-y-5">
              <Card className="rounded-[1.75rem] border-[#d8e8e5] bg-white/85 shadow-[0_18px_60px_-42px_rgba(35,72,81,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#111827cc]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-[#1b3942] dark:text-white">
                    Need more help?
                  </CardTitle>
                  <CardDescription>
                    Reach out when a question involves a specific listing,
                    account problem, or shelter workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.25rem] border border-[#dbe9e6] bg-[#f7fbfa] p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#678188] dark:text-[#9bb0b6]">
                      Support email
                    </p>
                    <a
                      href="mailto:support@petswipe.app"
                      className="mt-2 inline-block text-base font-semibold text-[#2b6d76] underline underline-offset-4 dark:text-[#8fe1da]"
                    >
                      support@petswipe.app
                    </a>
                  </div>

                  <div className="grid gap-3">
                    {[
                      {
                        icon: HeartHandshake,
                        title: "Liked pet next steps",
                        text: "Contact the shelter directly, confirm availability, and ask about temperament, routines, fees, and medical history.",
                      },
                      {
                        icon: Smartphone,
                        title: "Using PetSwipe on mobile",
                        text: "The app is tuned for smaller screens, including the swipe flow, mobile navbar, planner, and insights pages.",
                      },
                    ].map((tip) => (
                      <div
                        key={tip.title}
                        className="rounded-[1.25rem] border border-[#dbe8e5] bg-white px-4 py-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-[#eff8f6] p-2 text-[#2b6d76] dark:bg-[#163134] dark:text-[#9de9e2]">
                            <tip.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#204650] dark:text-white">
                              {tip.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#698189] dark:text-[#aabdc2]">
                              {tip.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-[#d8e8e5] bg-gradient-to-br from-[#f0faf7] via-white to-[#f7f2ff] shadow-[0_18px_60px_-45px_rgba(35,72,81,0.5)] dark:border-white/10 dark:from-[#102224] dark:via-[#101827] dark:to-[#1b1730]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl text-[#193940] dark:text-white">
                    Good adoption habits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-[#5f7b82] dark:text-[#b7c8cc]">
                  <p>
                    Save pets thoughtfully, follow up promptly, and be honest
                    with shelters about your home, schedule, and expectations.
                  </p>
                  <p>
                    The best matches happen when interest in the app turns into
                    a real, responsible conversation with the organization
                    caring for the pet.
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={() => router.push("/home")}
                      className="w-full rounded-full bg-[#234851] px-5 text-white hover:bg-[#1b3941]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FAQ;
