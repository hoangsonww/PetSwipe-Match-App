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
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
  AnimatePresence,
  useMotionValue
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
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const blobX = useTransform(mouseX, [0, window.innerWidth], [-50, 50]);
  const blobY2 = useTransform(mouseY, [0, window.innerHeight], [-50, 50]);
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
            ease: "linear"
          }}
        />

        {/* Blob #1: larger, drifting with scroll + mouse */}
        <motion.div
          style={{
            y: blobY,
            x: blobX,
            transform: "translate3d(0,0,0)"
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
            y: useTransform(mouseY, [0, window.innerHeight], [-75, 75]),
            scale: useTransform(mouseY, [0, window.innerHeight], [1, 1.15])
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
      <section className="py-24 bg-[#f8fcff] font-inter" id="features">
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
      </section>
      <section className="py-24 bg-[#eaf6fd] font-inter">
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
          <p className="mt-4 text-lg text-gray-600">Numbers that wag tails.</p>
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
            <div
              key={stat.label}
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
            </div>
          ))}
        </motion.div>
      </section>
      <section className="py-24 bg-[#fdfdff] font-inter">
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
                "Within a day I matched with Luna – she’s now my jogging buddy and best friend. PetSwipe made it so easy!",
              name: "— Jessica M.",
            },
            {
              quote:
                "I was hesitant about shelter pets, but the detailed profiles and adorable pictures won me over.",
              name: "— Aaron P.",
            },
            {
              quote:
                "The swipe interface is genius. I adopted Whiskers in less than 48 hours.",
              name: "— Sandra K.",
            },
            {
              quote:
                "The filter feature found me a calm senior dog that fits my lifestyle perfectly.",
              name: "— Mark T.",
            },
            {
              quote:
                "PetSwipe removed all the paperwork headaches. Bella is home at last!",
              name: "— Emily R.",
            },
            {
              quote:
                "Scrolling success stories brightened my day – then I added mine!",
              name: "— Sarah W.",
            },
          ].map((t, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              custom={0.2 + i * 0.15}
              viewport={{ once: true }}
              className="p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow border border-[#e0e7ff]"
            >
              <p className="italic text-gray-700">“{t.quote}”</p>
              <p className="mt-4 font-medium text-[#234851]">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </section>
      <section className="py-24 bg-gradient-to-r from-[#7097A8] to-[#5f868d] text-white text-center relative overflow-hidden font-inter">
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white opacity-10 blur-3xl" />
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
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </>
  );
};

export default Landing;
