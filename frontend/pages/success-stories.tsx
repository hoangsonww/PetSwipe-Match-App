import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import {
  Heart,
  PawPrint,
  Building2,
  TrendingUp,
  Quote,
  Sparkles,
  Filter,
  Star,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { petApi } from "@/lib/api";

/* ── animation variants ─────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: d, ease: "easeOut" },
  }),
};

/* ── CountUp (same pattern as homepage) ──────────────────────────────── */

function CountUp({
  end,
  suffix = "",
  label,
  icon,
  duration = 2000,
  delay = 0,
}: {
  end: number;
  suffix?: string;
  label: string;
  icon: React.ReactNode;
  duration?: number;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(prefersReducedMotion ? end : 0);

  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const range = end;
    const steps = Math.max(1, Math.ceil(duration / 16));
    const stepTime = duration / steps;
    let current = 0;
    let stepCount = 0;
    const timer = setTimeout(function tick() {
      stepCount++;
      current = Math.min(end, Math.floor((range * stepCount) / steps));
      setCount(current);
      if (stepCount < steps) setTimeout(tick, stepTime);
    }, delay);
    return () => clearTimeout(timer);
  }, [end, duration, delay, prefersReducedMotion, isInView]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF6F3] text-[#234851] dark:bg-[#1a3a3f] dark:text-[#B6EBE9]">
        {icon}
      </div>
      <span className="text-3xl font-extrabold text-[#234851] dark:text-white sm:text-4xl">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        {label}
      </span>
    </div>
  );
}

/* ── story data ──────────────────────────────────────────────────────── */

const stories = [
  {
    name: "Jessica M.",
    pet: "Luna",
    type: "Dog",
    quote:
      "Within a day I matched with Luna — she is now my jogging buddy and best friend. PetSwipe made it so easy!",
    photo:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    adopted: "2 weeks ago",
    featured: true,
  },
  {
    name: "Aaron P.",
    pet: "Mochi",
    type: "Cat",
    quote:
      "I was hesitant about shelter pets, but the detailed profiles and adorable pictures won me over. Mochi is the best thing that happened to me.",
    photo:
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop",
    adopted: "1 month ago",
    featured: false,
  },
  {
    name: "Sandra K.",
    pet: "Whiskers",
    type: "Cat",
    quote:
      "The swipe interface is genius. I adopted Whiskers in less than 48 hours. He's curled up on my lap right now.",
    photo:
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&h=400&fit=crop",
    adopted: "3 weeks ago",
    featured: false,
  },
  {
    name: "Mark T.",
    pet: "Biscuit",
    type: "Dog",
    quote:
      "The filter feature found me a calm senior dog that fits my lifestyle perfectly. Biscuit sleeps at my feet every night.",
    photo:
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop",
    adopted: "2 months ago",
    featured: false,
  },
  {
    name: "Emily R.",
    pet: "Bella",
    type: "Dog",
    quote:
      "PetSwipe removed all the paperwork headaches. Bella is home at last! My kids are overjoyed.",
    photo:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop",
    adopted: "6 weeks ago",
    featured: false,
  },
  {
    name: "Sarah W.",
    pet: "Cleo",
    type: "Cat",
    quote:
      "Scrolling success stories brightened my day — then I added mine! Cleo chose me, honestly.",
    photo:
      "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&h=400&fit=crop",
    adopted: "1 month ago",
    featured: false,
  },
  {
    name: "David L.",
    pet: "Thumper",
    type: "Rabbit",
    quote:
      "Never thought I'd adopt a rabbit through a swiping app, but here we are. Thumper has his own corner of the living room now.",
    photo:
      "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=400&fit=crop",
    adopted: "3 months ago",
    featured: false,
  },
  {
    name: "Priya N.",
    pet: "Kiwi",
    type: "Bird",
    quote:
      "Kiwi sings every morning. The shelter profile mentioned he was vocal — understatement of the year. I love him.",
    photo:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=400&fit=crop",
    adopted: "5 weeks ago",
    featured: false,
  },
  {
    name: "Carlos G.",
    pet: "Duke",
    type: "Dog",
    quote:
      "Duke was passed over for months at the shelter. One swipe right and now he's the happiest dog on the block.",
    photo:
      "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400&h=400&fit=crop",
    adopted: "2 months ago",
    featured: false,
  },
  {
    name: "Aisha J.",
    pet: "Noodle",
    type: "Cat",
    quote:
      "My apartment was too quiet. Noodle fixed that in about four seconds flat. Best decision I ever made.",
    photo:
      "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&h=400&fit=crop",
    adopted: "3 weeks ago",
    featured: false,
  },
  {
    name: "Tom H.",
    pet: "Maple",
    type: "Dog",
    quote:
      "Maple had been returned twice before. She just needed the right person. The insights page helped me see we were a match.",
    photo:
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&h=400&fit=crop",
    adopted: "6 weeks ago",
    featured: true,
  },
  {
    name: "Lin C.",
    pet: "Oliver",
    type: "Cat",
    quote:
      "I compared three cats on the adoption planner and Oliver scored highest on every metric that mattered to me. He's perfect.",
    photo:
      "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400&h=400&fit=crop",
    adopted: "1 month ago",
    featured: false,
  },
];

const typeColors: Record<string, string> = {
  Dog: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Cat: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  Bird: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  Rabbit:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

/* ── page component ──────────────────────────────────────────────────── */

const SuccessStories: NextPage = () => {
  const prefersReducedMotion = useReducedMotion();
  const liftHover = prefersReducedMotion ? {} : { y: -4, scale: 1.01 };

  /* live stats from API */
  const [liveStats, setLiveStats] = useState({
    totalPets: 0,
    shelters: 0,
    types: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pets = await petApi.listPets();
        if (cancelled) return;
        const shelterSet = new Set<string>();
        const typeSet = new Set<string>();
        for (const p of pets) {
          if (p.shelterName) shelterSet.add(p.shelterName);
          if (p.type) typeSet.add(p.type);
        }
        setLiveStats({
          totalPets: pets.length,
          shelters: shelterSet.size,
          types: typeSet.size,
        });
      } catch {
        /* no-op — stats stay at 0 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* type filter */
  const allTypes = useMemo(
    () => Array.from(new Set(stories.map((s) => s.type))).sort(),
    [],
  );
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const featured = stories.filter((s) => s.featured);
  const filtered = activeFilter
    ? stories.filter((s) => s.type === activeFilter)
    : stories;

  return (
    <Layout>
      <Head>
        <title>Success Stories | PetSwipe</title>
        <meta
          name="description"
          content="Real adoption stories from the PetSwipe community. See how pets and people found each other."
        />
      </Head>

      <div className="min-h-screen">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <Badge className="mb-6 rounded-full border-[#9dd8d4] bg-[#ecfbf7] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#1d5a59] dark:border-[#376b69] dark:bg-[#12292a] dark:text-[#b8f2ec]">
                Community
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#234851] dark:text-white sm:text-5xl md:text-6xl">
                Happy Tails,{" "}
                <span className="text-[#7097A8]">Real Stories</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
                Every swipe right is a chance at a forever home. These are the
                stories of pets and people who found each other through
                PetSwipe.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Live Stats ────────────────────────────────────────────── */}
        <section className="relative -mt-8 z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:grid-cols-4 sm:gap-6 sm:p-8"
          >
            <CountUp
              end={liveStats.totalPets}
              label="Pets Listed"
              icon={<PawPrint className="h-5 w-5" />}
            />
            <CountUp
              end={liveStats.shelters}
              label="Shelters"
              icon={<Building2 className="h-5 w-5" />}
              delay={150}
            />
            <CountUp
              end={liveStats.types}
              label="Pet Types"
              icon={<Sparkles className="h-5 w-5" />}
              delay={300}
            />
            <CountUp
              end={stories.length}
              suffix="+"
              label="Adoptions Shared"
              icon={<Heart className="h-5 w-5" />}
              delay={450}
            />
          </motion.div>
        </section>

        {/* ── Featured Spotlight ─────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-center text-2xl font-bold text-[#234851] dark:text-white sm:text-3xl">
              Featured Stories
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-neutral-500 dark:text-neutral-400">
              Adoptions that inspired the whole community.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {featured.map((story, i) => (
              <motion.div
                key={story.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={i * 0.15}
                viewport={{ once: true }}
                whileHover={liftHover}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="absolute right-4 top-4 z-10">
                  <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Star className="mr-1 inline h-3 w-3" />
                    Featured
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-56 w-full shrink-0 sm:h-auto sm:w-48">
                    <img
                      src={story.photo}
                      alt={story.pet}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent sm:bg-gradient-to-r" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-6">
                    <Quote className="mb-3 h-6 w-6 text-[#7097A8]/40" />
                    <p className="text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                      &ldquo;{story.quote}&rdquo;
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-[#234851] dark:text-white">
                        {story.name}
                      </span>
                      <span className="text-xs text-neutral-400">&bull;</span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        Adopted {story.pet}
                      </span>
                      <Badge
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[story.type] ?? ""}`}
                      >
                        {story.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      {story.adopted}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── All Stories Grid ────────────────────────────────────────── */}
        <section className="bg-[#F8FBFC] py-16 dark:bg-gray-900/50 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <h2 className="text-2xl font-bold text-[#234851] dark:text-white sm:text-3xl">
                  All Adoption Stories
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "story" : "stories"}
                  {activeFilter ? ` about ${activeFilter}s` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-400" />
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeFilter === null
                      ? "bg-[#234851] text-white shadow-sm"
                      : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
                  }`}
                >
                  All
                </button>
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setActiveFilter(activeFilter === t ? null : t)
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      activeFilter === t
                        ? "bg-[#234851] text-white shadow-sm"
                        : "bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-slate-800 dark:text-neutral-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((story, i) => (
                  <motion.div
                    key={story.name + story.pet}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    whileHover={liftHover}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={story.photo}
                        alt={story.pet}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <Badge
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[story.type] ?? ""}`}
                        >
                          {story.type}
                        </Badge>
                        <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          {story.adopted}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <Quote className="mb-2 h-4 w-4 text-[#7097A8]/30" />
                      <p className="flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                        &ldquo;{story.quote}&rdquo;
                      </p>
                      <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF6F3] text-xs font-bold text-[#234851] dark:bg-[#1a3a3f] dark:text-[#B6EBE9]">
                          {story.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#234851] dark:text-white">
                            {story.name}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Adopted {story.pet}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── Why Adopters Love PetSwipe ─────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-[#234851] dark:text-white sm:text-3xl">
              Why Adopters Love PetSwipe
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
              What keeps people coming back.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Swipe in seconds, adopt in days",
                desc: "No forms, no phone trees. Like a pet, connect with the shelter, and schedule a visit — all from one screen.",
                icon: <Sparkles className="h-5 w-5" />,
              },
              {
                title: "Verified shelter profiles",
                desc: "Every listing comes from a vetted shelter with real contact info and up-to-date availability.",
                icon: <Building2 className="h-5 w-5" />,
              },
              {
                title: "Smart matching that learns",
                desc: "The more you swipe, the better PetSwipe understands your preferences and surfaces pets that fit.",
                icon: <TrendingUp className="h-5 w-5" />,
              },
              {
                title: "Every species, every size",
                desc: "Dogs, cats, birds, rabbits, and exotics — all in one place with type-specific care info.",
                icon: <PawPrint className="h-5 w-5" />,
              },
              {
                title: "Compare before you commit",
                desc: "The adoption planner lets you stack favorites side by side so you pick the right fit, not just the cutest face.",
                icon: <Star className="h-5 w-5" />,
              },
              {
                title: "Shelter locations on a live map",
                desc: "See exactly where pets are and find shelters near you with one tap.",
                icon: <Heart className="h-5 w-5" />,
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={i * 0.08}
                viewport={{ once: true }}
                className="rounded-2xl border border-white/60 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF6F3] text-[#234851] dark:bg-[#1a3a3f] dark:text-[#B6EBE9]">
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-[#234851] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default SuccessStories;
