import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import type { NextPage } from "next";
import {
  PawPrint,
  Heart,
  MoveRight,
  Search,
  Users,
  ShieldCheck,
  Rocket,
  Github,
  FileText,
  ChevronDown,
  Sparkles,
  Cpu,
  Cloud,
  Layers,
  Workflow,
  Database,
  Activity,
  Radar,
  MapPin,
  Bot,
  Wand2,
  MessageSquare,
  Bell,
  BarChart3,
  UserCheck,
  CheckCircle2,
  Settings,
  Globe,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
  AnimatePresence,
  useMotionValue,
} from "framer-motion";
import { Button } from "@/components/ui/button";

const rotatingWords = ["Swipe", "Discover", "Adopt", "Love", "Rescue", "Share"];
const features = [
  {
    icon: <MoveRight size={42} />,
    title: "Swipe Interface",
    desc: "A fun, intuitive Tinder‑style deck that helps you judge pets in seconds.",
  },
  {
    icon: <Heart size={42} />,
    title: "Instant Matches",
    desc: "Like a pet and we’ll notify the shelter right away - no forms, no fuss.",
  },
  {
    icon: <Search size={42} />,
    title: "Smart Filters",
    desc: "Filter by age, breed or temperament so you only see your perfect pals.",
  },
  {
    icon: <Users size={42} />,
    title: "Community Stories",
    desc: "Real‑time success stories to warm your heart and inspire your swipe.",
  },
  {
    icon: <ShieldCheck size={42} />,
    title: "Verified Shelters",
    desc: "Every listing comes straight from a partner shelter - 100% trustworthy.",
  },
  {
    icon: <Rocket size={42} />,
    title: "Lightning Fast",
    desc: "Optimized for speed: swipe through hundreds of pets without lag.",
  },
];
const journeySteps = [
  {
    icon: <UserCheck size={28} />,
    title: "Create your adoption profile",
    desc: "Tell us your lifestyle, schedule, and preferences to unlock tailored matches.",
  },
  {
    icon: <Sparkles size={28} />,
    title: "AI-guided recommendations",
    desc: "Ranking models learn from swipes, saves, and filters to prioritize the best fits.",
  },
  {
    icon: <MessageSquare size={28} />,
    title: "Chat instantly with shelters",
    desc: "Message, schedule visits, and complete screening in one guided flow.",
  },
  {
    icon: <CheckCircle2 size={28} />,
    title: "Adopt with confidence",
    desc: "Verified listings, transparent histories, and post-adoption support.",
  },
];
const aiHighlights = [
  {
    icon: <Cpu size={26} />,
    title: "Adaptive matching",
    desc: "Signals like swipe velocity and favorites shape a personalized ranking model.",
  },
  {
    icon: <Wand2 size={26} />,
    title: "Smart profile enrichment",
    desc: "NLP summaries and auto-tagging highlight temperament, routines, and care needs.",
  },
  {
    icon: <Bot size={26} />,
    title: "Adoption concierge",
    desc: "Conversational assistants craft outreach, reminders, and next-step guidance.",
  },
  {
    icon: <Radar size={26} />,
    title: "Trust and safety signals",
    desc: "Anomaly detection flags duplicates, risky content, and inconsistent listings.",
  },
  {
    icon: <MapPin size={26} />,
    title: "Geo-aware discovery",
    desc: "Distance and commute modeling keeps recommendations realistic and timely.",
  },
  {
    icon: <Sparkles size={26} />,
    title: "Discovery mode",
    desc: "Exploration surfaces new breeds while preserving fit and adoption readiness.",
  },
];
const platformHighlights = [
  {
    icon: <Cloud size={26} />,
    title: "AWS-native deployment",
    desc: "Scalable compute, storage, and CDN delivery for fast, global experiences.",
  },
  {
    icon: <Layers size={26} />,
    title: "Terraform infrastructure",
    desc: "Versioned IaC for repeatable environments, policies, and drift control.",
  },
  {
    icon: <Workflow size={26} />,
    title: "CI/CD automation",
    desc: "Containerized builds and Jenkins pipelines keep releases safe and fast.",
  },
  {
    icon: <Database size={26} />,
    title: "Data + analytics stack",
    desc: "Event pipelines and feature stores power insights and model feedback loops.",
  },
  {
    icon: <ShieldCheck size={26} />,
    title: "Security by default",
    desc: "Encrypted data, OAuth flows, and audit trails protect every interaction.",
  },
  {
    icon: <Activity size={26} />,
    title: "Observability",
    desc: "Metrics, logs, and alerts provide end-to-end visibility across services.",
  },
];
const shelterHighlights = [
  {
    icon: <Bell size={26} />,
    title: "Real-time match alerts",
    desc: "Shelters get notified the moment a high-intent adopter swipes right.",
  },
  {
    icon: <BarChart3 size={26} />,
    title: "Adoption analytics",
    desc: "Track conversion, wait times, and listing performance by location.",
  },
  {
    icon: <Settings size={26} />,
    title: "Inventory management",
    desc: "Bulk uploads, status changes, and rich media all in one console.",
  },
  {
    icon: <Globe size={26} />,
    title: "Partner-ready APIs",
    desc: "Sync with shelter systems and outreach tools using secure integrations.",
  },
];
const trustHighlights = [
  {
    icon: <ShieldCheck size={26} />,
    title: "Verified shelter onboarding",
    desc: "Multi-step validation and partner checks keep listings credible.",
  },
  {
    icon: <Users size={26} />,
    title: "Identity-aware profiles",
    desc: "Role-based access for adopters, staff, and administrators.",
  },
  {
    icon: <MessageSquare size={26} />,
    title: "Secure communication",
    desc: "In-app messaging keeps personal contact data protected.",
  },
  {
    icon: <Search size={26} />,
    title: "Transparent pet histories",
    desc: "Medical, behavior, and intake details are visible upfront.",
  },
  {
    icon: <Activity size={26} />,
    title: "Anomaly monitoring",
    desc: "Automated signals flag suspicious or duplicate listings.",
  },
  {
    icon: <Bell size={26} />,
    title: "Live adoption status",
    desc: "Instant updates reduce double bookings and stale listings.",
  },
];
const stackTracks = [
  {
    icon: <Layers size={26} />,
    title: "Frontend experience",
    items: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
  },
  {
    icon: <Database size={26} />,
    title: "Data layer",
    items: ["Postgres + TypeORM", "Redis caching", "Supabase storage"],
  },
  {
    icon: <Cpu size={26} />,
    title: "AI services",
    items: ["Ranking models", "NLP summaries", "Image processing"],
  },
  {
    icon: <Cloud size={26} />,
    title: "Cloud + infrastructure",
    items: ["AWS compute", "Terraform IaC", "Containerized services"],
  },
  {
    icon: <Workflow size={26} />,
    title: "Delivery pipeline",
    items: ["Jenkins automation", "Integration tests", "Release controls"],
  },
  {
    icon: <Activity size={26} />,
    title: "Observability",
    items: ["Metrics + logs", "Alerting", "Audit trails"],
  },
];
const faqItems = [
  {
    q: "How does PetSwipe recommend pets?",
    a: "A mix of swipe behavior, filters, and AI ranking signals surfaces the most compatible profiles.",
  },
  {
    q: "What makes listings trustworthy?",
    a: "Shelters are verified and each pet profile includes transparent history and care details.",
  },
  {
    q: "Can shelters manage listings in bulk?",
    a: "Yes. The partner console supports bulk uploads, status updates, and inventory analytics.",
  },
  {
    q: "Is the platform mobile-friendly?",
    a: "The experience is optimized for mobile swiping and responsive on every screen size.",
  },
  {
    q: "How fast can a shelter launch?",
    a: "Onboarding is streamlined with guided setup and Terraform-backed environments.",
  },
  {
    q: "What does AI help with besides matching?",
    a: "AI supports tagging, bio summaries, safety checks, and proactive adopter guidance.",
  },
];

function CountUp({
  end,
  label,
  duration = 2000,
  delay = 0,
}: {
  end: number;
  label: string;
  duration?: number;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(prefersReducedMotion ? end : 0);

  useEffect(() => {
    if (prefersReducedMotion || !isInView) return;
    const start = 0;
    const range = end - start;
    const steps = Math.max(1, Math.ceil(duration / 16));
    const stepTime = duration / steps;
    let current = start;
    let stepCount = 0;
    const timer = setTimeout(function tick() {
      stepCount++;
      current = Math.min(end, Math.floor((range * stepCount) / steps + start));
      setCount(current);
      if (stepCount < steps) {
        setTimeout(tick, stepTime);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [end, duration, delay, prefersReducedMotion, isInView]);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-4xl md:text-5xl font-extrabold text-[#234851]">
        {count.toLocaleString()}+
      </span>
      <span className="mt-2 block text-sm text-gray-700">{label}</span>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 40, willChange: "opacity, transform" as const },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: d, ease: "easeOut" },
  }),
};

const Landing: NextPage = () => {
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const iv = setInterval(
      () => setWordIndex((i) => (i + 1) % rotatingWords.length),
      2000,
    );
    return () => clearInterval(iv);
  }, []);
  const prefersReducedMotion = useReducedMotion();
  const cardHover = prefersReducedMotion ? {} : { y: -6, scale: 1.02 };
  const liftHover = prefersReducedMotion ? {} : { y: -6 };
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const blobX = useTransform(mouseX, [0, windowSize.width], [-50, 50]);
  const blobY2 = useTransform(mouseY, [0, windowSize.height], [-50, 50]);
  const { scrollY } = useScroll();
  const blobY = useTransform(
    scrollY,
    [0, 500],
    prefersReducedMotion ? [0, 0] : [0, 150],
  );

  return (
    <>
      <Head>
        <title>PetSwipe - Swipe, Match, Adopt.</title>
        <meta
          name="description"
          content="Swipe through adoptable pets near you, match instantly, and bring home your new best friend."
        />
      </Head>
      <section
        className="relative flex items-center justify-center min-h-screen overflow-hidden font-inter"
        onMouseMove={(e) => {
          mouseX.set(e.clientX);
          mouseY.set(e.clientY);
        }}
      >
        <motion.div
          className="absolute inset-0 -z-10 bg-[length:400%_400%] bg-[linear-gradient(120deg,#e8f8ff,#f5fdff,#ffe9f3,#f6fcff,#e8f8ff)]"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
          transition={{
            repeat: Infinity,
            duration: 20,
            ease: "linear",
          }}
        />
        {/* Blob #1: larger, drifting with scroll + mouse */}
        <motion.div
          style={{
            y: blobY,
            x: blobX,
            transform: "translate3d(0,0,0)",
          }}
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#90cdf4] opacity-20 blur-3xl will-change-transform"
        />
        {/* Blob #2: medium circle drifting opposite scroll direction + inverse mouse X */}
        <motion.div
          style={{
            y: useTransform(scrollY, [0, 500], [0, -100]),
            x: useTransform(blobX, [-50, 50], [50, -50]),
            transform: "translate3d(0,0,0)",
          }}
          className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-[#f687b3] opacity-20 blur-3xl will-change-transform"
        />
        {/* Blob #3: small, gently pulsating & following mouseY */}
        <motion.div
          style={{
            y: useTransform(blobY2, [0, windowSize.height], [-75, 75]),
            scale: useTransform(blobY2, [0, windowSize.height], [1, 1.15]),
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 rounded-full bg-[#f6b3c7] opacity-15 blur-3xl will-change-transform"
        />
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-32 relative z-10 text-center">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md text-[#234851] font-medium shadow"
          >
            <PawPrint size={20} className="text-[#7097A8]" />
            Adopt, don’t shop!
          </motion.span>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.15}
            className="text-4xl md:text-[56px] leading-tight font-extrabold text-[#234851]"
          >
            Find your&nbsp;
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#7097A8] to-[#5f868d]">
              forever friend
            </span>
            &nbsp;today
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="mt-6 max-w-3xl mx-auto text-gray-700 text-lg md:text-xl"
          >
            Swipe. Match. <span className="font-semibold">Adopt.</span> Pet
            adoption made joyful.
          </motion.p>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.45}
            className="mt-4 text-2xl md:text-3xl font-medium text-[#234851] leading-snug flex justify-center items-baseline"
          >
            <span className="inline-block mr-2 mb-[2px] align-baseline">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="
                    inline-block
                    bg-[#E1F4FB]
                    text-[#234851]
                    font-extrabold
                    px-3
                    py-1
                    rounded-lg
                    align-baseline
                    text-3xl
                  "
                >
                  {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="align-baseline">
              pets near you – in real time.
            </span>
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.6}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            <Link href="/home" passHref>
              <Button className="px-8 py-3 text-lg bg-[#7097A8] hover:bg-[#5f868d] text-white shadow-lg">
                Browse Pets
              </Button>
            </Link>
            <Link href="/signup" passHref>
              <Button
                variant="outline"
                className="px-8 py-3 text-lg hover:bg-[#f0fdfa] border-[#7097A8] text-[#234851]"
              >
                Create Account
              </Button>
            </Link>
            <Link href="/faq" passHref>
              <Button
                variant="ghost"
                className="
                  px-8 py-3 text-lg text-[#234851]
                  border-2 border-dashed border-[#234851]
                  rounded-lg
                  hover:bg-[#f0fdfa]
                  transition-colors duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#234851]
                "
              >
                FAQs
              </Button>
            </Link>
            <div className="w-full flex justify-center">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`
                  px-8 py-3 text-lg
                  text-[#234851]
                  border-2 border-transparent hover:border-[#7097A8]
                  flex items-center
                  rounded-lg
                  transition-all duration-200 ease-in-out transform
                  hover:translate-y-1
                `}
              >
                Learn More
                <ChevronDown className="ml-2" size={20} />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      <section
        className="relative py-24 bg-[#f8fcff] font-inter overflow-hidden"
        id="features"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#e6f3ff,transparent_65%)] opacity-70" />
          <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#d7eefb] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#ffe7f2] opacity-40 blur-3xl animate-float-slower" />
        </div>
        <div className="relative z-10">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-extrabold text-center text-[#234851]"
          >
            Why PetSwipe?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            custom={0.2}
            viewport={{ once: true }}
            className="mt-4 text-center text-gray-600 max-w-xl mx-auto"
          >
            We make pet adoption effortless, delightful, and&nbsp;successful.
          </motion.p>
          <div className="mt-16 grid gap-10 px-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="
                  relative overflow-hidden p-6 bg-white rounded-2xl shadow-md
                  transition-opacity transition-transform duration-500 ease-out
                  group
                  transform-gpu will-change-[opacity,transform]
                "
                style={{
                  WebkitBackfaceVisibility: "hidden",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#e2f0ff] text-[#7097A8] mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg text-[#234851] mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 relative z-10">{f.desc}</p>
                <span className="absolute bottom-4 left-6 block h-1 w-10 bg-[#7097A8] rounded-full transition-transform duration-300 group-hover:translate-x-2" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-[#c7e2f5] transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-white font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#d7eefb,transparent_60%)] opacity-70" />
          <div className="absolute -left-10 top-20 h-72 w-72 rounded-full bg-[#d7eefb] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#ffe3ef] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(112,151,168,0.12),transparent,rgba(95,134,141,0.12))] animate-grid" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-extrabold text-center text-[#234851]"
          >
            How PetSwipe Works
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            custom={0.2}
            viewport={{ once: true }}
            className="mt-4 text-center text-gray-600 max-w-2xl mx-auto"
          >
            A guided journey for adopters and shelters, designed to move faster
            without sacrificing trust.
          </motion.p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, idx) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={liftHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur border border-white/60 p-6 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                    {step.icon}
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-[#7097A8]">
                    STEP 0{idx + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#234851]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-gray-600">{step.desc}</p>
                <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-[#e2f0ff] opacity-40 blur-2xl transition-transform duration-500 group-hover:scale-110" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-[#f7fbff] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#dbeffc] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-10 top-1/3 h-64 w-64 rounded-full bg-[#fce7f3] opacity-50 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#e8f4ff,transparent_60%)] opacity-70" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#234851] shadow">
              <Sparkles className="h-4 w-4 text-[#7097A8]" />
              AI Matching Engine
            </span>
            <h2 className="mt-6 text-3xl md:text-4xl font-extrabold text-[#234851]">
              Intelligence that builds trust and better matches
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              PetSwipe blends recommender systems, NLP, and computer vision to
              surface pets that fit your lifestyle while helping shelters move
              faster with clearer context.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "Computer vision tagging",
                "NLP bio summaries",
                "Embedding search",
                "Ranking models",
                "Safety signals",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#c7e2f5] bg-white/70 px-4 py-2 text-xs font-semibold text-[#234851]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2">
            {aiHighlights.map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#234851]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                <div className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-[#fce7f3] opacity-40 blur-2xl" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-[#eef6fb] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[#d7eefb] opacity-50 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#e2f0ff] opacity-50 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(112,151,168,0.12),transparent,rgba(95,134,141,0.12))] animate-grid" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#234851]">
              Built for reliable scale
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Cloud-first infrastructure with AWS, Terraform, Docker, and
              automated pipelines keeps PetSwipe fast, resilient, and secure.
            </p>
          </motion.div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {platformHighlights.map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-lg border border-white/70 backdrop-blur"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#234851]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7097A8] to-transparent opacity-60" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-white font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-[#e2f0ff] opacity-50 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#ffe7f2] opacity-40 blur-3xl animate-float-slower" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#234851]">
              Shelter operations that run smoother
            </h2>
            <p className="mt-4 text-gray-600">
              A dedicated partner console helps shelters publish listings, manage
              inquiries, and close adoptions with less overhead.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-gray-600">
              {[
                "Intake to adoption pipeline tracking",
                "Automated follow-ups and reminders",
                "Community impact reporting",
                "Centralized messaging and scheduling",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e2f0ff] text-[#7097A8]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2">
            {shelterHighlights.map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl bg-white/80 p-5 shadow-lg border border-white/70 backdrop-blur"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#234851]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-[#f7fbff] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#dbeffc] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#ffe7f2] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#e6f3ff,transparent_60%)] opacity-70" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#234851]">
              Trust and safety at every step
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              A secure adoption experience with verified partners, transparent
              profiles, and proactive monitoring.
            </p>
          </motion.div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {trustHighlights.map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl bg-white/85 p-6 shadow-lg border border-white/70 backdrop-blur"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#234851]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7097A8] to-transparent opacity-60" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-white font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-[#dbeffc] opacity-50 blur-3xl animate-float-slow" />
          <div className="absolute right-8 bottom-0 h-80 w-80 rounded-full bg-[#ffe3ef] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(112,151,168,0.12),transparent,rgba(95,134,141,0.12))] animate-grid" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-6 grid gap-12 lg:grid-cols-[1.05fr_1fr] items-start">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#234851] shadow">
              <Layers className="h-4 w-4 text-[#7097A8]" />
              End-to-end stack
            </span>
            <h2 className="mt-6 text-3xl md:text-4xl font-extrabold text-[#234851]">
              Full-stack architecture built for speed and scale
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              PetSwipe runs on a modern stack that keeps swipes fast, data
              consistent, and deployments reliable across environments.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-gray-600">
              {[
                "Responsive UI optimized for mobile-first swiping",
                "API-first services for web, admin, and partner integrations",
                "Caching and messaging layers for low-latency feeds",
                "Infrastructure as code for repeatable releases",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e2f0ff] text-[#7097A8]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2">
            {stackTracks.map((track, idx) => (
              <motion.div
                key={track.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={cardHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl bg-white/85 p-5 shadow-lg border border-white/70 backdrop-blur"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e2f0ff] text-[#7097A8]">
                  {track.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#234851]">
                  {track.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#c7e2f5] bg-white/70 px-3 py-1 text-xs font-semibold text-[#234851]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-[#eaf6fd] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-16 top-12 h-72 w-72 rounded-full bg-[#d7eefb] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#ffe7f2] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#dbeffc,transparent_60%)] opacity-70" />
        </div>
        <div className="relative z-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mx-auto max-w-3xl px-4"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#234851]">
              Our Impact
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Numbers that wag tails.
            </p>
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            custom={0.2}
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 px-4 max-w-5xl mx-auto"
          >
            {[
              { end: 12000, label: "Pets Swiped" },
              { end: 4800, label: "Total Matches", delay: 300 },
              { end: 3100, label: "Successful Adoptions", delay: 600 },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + i * 0.1}
                viewport={{ once: true }}
                whileHover={liftHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative overflow-hidden rounded-2xl p-8 flex flex-col items-center bg-gradient-to-br from-[#CFE7F2] to-[#E1F4FB] shadow-lg"
              >
                <div className="absolute top-0 left-1/2 w-[120%] h-[120%] bg-[#7097A8]/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-blob will-change-transform" />
                <div className="relative z-10 text-center">
                  <CountUp
                    end={stat.end}
                    duration={2000}
                    delay={stat.delay}
                    label={stat.label}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      <section className="relative py-24 bg-[#fdfdff] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#e2f0ff] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#ffe7f2] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f2fbff,transparent_60%)] opacity-70" />
        </div>
        <div className="relative z-10">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-extrabold text-center text-[#234851]"
          >
            Happy Tails
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            custom={0.2}
            viewport={{ once: true }}
            className="mt-4 text-center text-gray-600 max-w-xl mx-auto"
          >
            Real stories from PetSwipe adopters.
          </motion.p>

          <div className="mt-16 grid gap-10 px-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                quote:
                  "Within a day I matched with Luna - she is now my jogging buddy and best friend. PetSwipe made it so easy!",
                name: "- Jessica M.",
              },
              {
                quote:
                  "I was hesitant about shelter pets, but the detailed profiles and adorable pictures won me over.",
                name: "- Aaron P.",
              },
              {
                quote:
                  "The swipe interface is genius. I adopted Whiskers in less than 48 hours.",
                name: "- Sandra K.",
              },
              {
                quote:
                  "The filter feature found me a calm senior dog that fits my lifestyle perfectly.",
                name: "- Mark T.",
              },
              {
                quote:
                  "PetSwipe removed all the paperwork headaches. Bella is home at last!",
                name: "- Emily R.",
              },
              {
                quote:
                  "Scrolling success stories brightened my day - then I added mine!",
                name: "- Sarah W.",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + i * 0.15}
                viewport={{ once: true }}
                whileHover={liftHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="p-6 bg-white/90 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow border border-[#e0e7ff] backdrop-blur"
              >
                <p className="italic text-gray-700">"{t.quote}"</p>
                <p className="mt-4 font-medium text-[#234851]">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="relative py-24 bg-[#f7fbff] font-inter overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#dbeffc] opacity-60 blur-3xl animate-float-slow" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#ffe3ef] opacity-40 blur-3xl animate-float-slower" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#e6f3ff,transparent_60%)] opacity-70" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-extrabold text-center text-[#234851]"
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            custom={0.2}
            viewport={{ once: true }}
            className="mt-4 text-center text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to know about PetSwipe, adoption flow, and the
            platform architecture.
          </motion.p>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {faqItems.map((item, idx) => (
              <motion.div
                key={item.q}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={0.2 + idx * 0.1}
                viewport={{ once: true }}
                whileHover={liftHover}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="rounded-2xl bg-white/85 p-6 shadow-lg border border-white/70 backdrop-blur"
              >
                <h3 className="text-base font-semibold text-[#234851]">
                  {item.q}
                </h3>
                <p className="mt-3 text-sm text-gray-600">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 bg-gradient-to-r from-[#7097A8] to-[#5f868d] text-white text-center relative overflow-hidden font-inter">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7fb3c7,transparent_60%)] opacity-50" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl animate-float-slower" />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white opacity-10 blur-3xl animate-float-slow" />
        <div className="relative z-10 mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">
            Ready to find your forever friend?
          </h2>
          <p className="mt-4 text-lg opacity-90">
            Join thousands who’ve adopted through PetSwipe.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/signup" passHref>
              <Button className="px-10 py-4 text-lg bg-white text-[#234851] hover:bg-gray-100 shadow-xl">
                Create Free Account
              </Button>
            </Link>
            <Link href="/home" passHref>
              <Button
                variant="outline"
                className="px-10 py-4 text-lg border-white text-white hover:bg-white/10"
              >
                Explore Pets
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <footer className="bg-[#fff] py-6 text-[#234851] font-inter">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-sm">
            From{" "}
            <Link href="https://github.com/hoangsonww" legacyBehavior>
              <a
                className="font-semibold underline hover:text-gray-700 transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                Son Nguyen
              </a>
            </Link>{" "}
            in 2025&nbsp;with{" "}
            <Heart className="inline-block h-4 w-4 text-red-400 align-middle" />
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="https://github.com/hoangsonww/PetSwipe-Match-App"
              legacyBehavior
            >
              <a
                className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                <span>GitHub&nbsp;Repository</span>
              </a>
            </Link>
            <Link href="/terms" legacyBehavior>
              <a className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap">
                <FileText className="h-4 w-4" />
                <span>Terms&nbsp;of&nbsp;Service</span>
              </a>
            </Link>
            <Link href="/privacy" legacyBehavior>
              <a className="flex items-center space-x-1 hover:text-gray-700 transition text-sm whitespace-nowrap">
                <ShieldCheck className="h-4 w-4" />
                <span>Privacy&nbsp;Policy</span>
              </a>
            </Link>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        html {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            sans-serif;
        }
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes blob {
          0%,
          100% {
            transform: translate3d(-10%, -10%, 0) scale(1);
          }
          50% {
            transform: translate3d(10%, 10%, 0) scale(1.05);
          }
        }
        @keyframes floatSlow {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -18px, 0);
          }
        }
        @keyframes floatSlower {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-20px, 12px, 0);
          }
        }
        @keyframes gridMove {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 100% 100%;
          }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
          will-change: transform;
        }
        .animate-float-slow {
          animation: floatSlow 14s ease-in-out infinite;
          will-change: transform;
        }
        .animate-float-slower {
          animation: floatSlower 20s ease-in-out infinite;
          will-change: transform;
        }
        .animate-grid {
          animation: gridMove 18s linear infinite;
          background-size: 200% 200%;
        }
      `}</style>
    </>
  );
};

export default Landing;
