import React, { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import { matchApi, swipeApi, Pet, Match } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { useSwipeable } from "react-swipeable";
import { toast, Toaster } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Lightbulb,
  HelpCircle,
  Loader2,
  ZoomIn,
  List,
  Heart,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";

/* --- shadcn ui --- */
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";

/* ------------ data fetch ------------- */
const fetchMatches = () => matchApi.listMyMatches();

/* ------------ static page slide (done) ------------- */
const pageVariants = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0 }),
};

/* ------------ active deck-card animation ------------- */
const deckCardVariants = {
  enter: (d: number) => ({ x: d > 0 ? 400 : -400, opacity: 0, zIndex: 20 }),
  center: { x: 0, opacity: 1, zIndex: 30 },
  exit: (d: number) => ({
    x: d > 0 ? -400 : 400,
    opacity: 0,
    zIndex: 40,
    transition: { duration: 0.35 },
  }),
};

const Home: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const { data: matches, error } = useSWR<Match[]>(
    user ? "matches" : null,
    fetchMatches,
  );
  const cases: Pet[] = matches?.map((m) => m.pet) ?? [];

  /* ---------- state ---------- */
  const [index, setIndex] = useState(-1); // start with instructions
  const [flipped, setFlipped] = useState(false);
  const [scale, setScale] = useState(100);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  const lastSwipeRef = useRef(0);

  /* ---------- navigation helpers ---------- */
  const goNext = () => {
    if (animating || index >= cases.length) return;
    setFlipped(false);
    setDirection(1);
    setAnimating(true);
    setIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (animating || index <= -1) return;
    setFlipped(false);
    setDirection(-1);
    setAnimating(true);
    setIndex((i) => i - 1);
  };

  /* ---------- swipe handling ---------- */
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (animating) return;
      lastSwipeRef.current = Date.now();
      if (index < 0) {
        // only advance one step from instruction to first pet
        setFlipped(false);
        setDirection(1);
        setAnimating(true);
        setIndex(0);
      } else {
        goNext();
      }
    },
    onSwipedRight: () => {
      if (animating) return;
      lastSwipeRef.current = Date.now();
      // only allow going back from pets, never from instruction
      if (index >= 0) goPrev();
    },
    delta: 20,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  /* ---------- redirect if not logged in ---------- */
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  /* ---------- save swipe ---------- */
  const handleResponse = async (liked: boolean) => {
    if (index < 0 || index >= cases.length) return;
    try {
      await swipeApi.recordSwipe(cases[index].id, liked);
      toast.success("Choice recorded");
      goNext();
    } catch {
      toast.error("Failed to record, please retry");
    }
  };

  /* ---------- error / loading ---------- */
  if (error) {
    return (
      <Layout>
        <p className="text-center text-red-600 mt-20">Error loading pets</p>
      </Layout>
    );
  }
  if (!matches) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-20 w-20 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  /* ---------- instruction card ---------- */
  const renderInstructionCard = (isTop: boolean) => (
    <div
      className="relative w-full h-full rounded-2xl shadow-lg bg-[#EDF6F3] flex flex-col items-start justify-center space-y-6 p-8 cursor-grab active:cursor-grabbing"
      style={{ perspective: 1000 }}
      {...(isTop ? swipeHandlers : {})}
      onClick={isTop ? goNext : undefined}
    >
      <h2 className="text-2xl font-semibold text-gray-800">Instructions</h2>
      <div className="text-gray-700 space-y-4">
        <p>On the following page, you will see pets available for adoption.</p>
        <p>
          Swipe right to “adopt” or left to “pass” based on their details and
          photo.
        </p>
        <p>Complete all to finish browsing pets.</p>
      </div>
      <Button
        onClick={goNext}
        className="mt-4 self-center bg-[#7097A8] hover:bg-[#5f868d] text-white flex items-center gap-2 px-6 py-2"
      >
        Start
      </Button>
    </div>
  );

  /* ---------- pet front/back ---------- */
  const renderCaseFace = (i: number, isTop: boolean) => {
    const p = cases[i];
    const handleCardClick = () => {
      const sinceSwipe = Date.now() - lastSwipeRef.current;
      if (sinceSwipe < 180) return;
      setFlipped((f) => !f);
    };

    return (
      <div
        className="relative w-full h-full max-h-screen cursor-grab active:cursor-grabbing"
        style={{ perspective: 1000 }}
        {...(isTop ? swipeHandlers : {})}
        onClick={isTop ? handleCardClick : undefined}
      >
        <div
          className="relative w-full h-full rounded-2xl shadow-lg max-h-screen"
          style={{
            transformStyle: "preserve-3d",
            transform: isTop && flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: isTop ? "transform 0.6s" : "none",
          }}
        >
          {/* ─── FRONT ─────────────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 flex flex-col p-6 bg-[#EDF6F3] rounded-2xl select-none overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Header */}
            <div className="text-center mb-4 flex-shrink-0">
              <h3 className="flex items-center justify-center gap-2 text-gray-600">
                <Award size={20} /> Pet #{i + 1}
              </h3>
              <p className="text-3xl font-bold text-gray-800">{p.name}</p>
            </div>

            {/* Image: fills remaining space, but container is capped */}
            {p.photoUrl && (
              <div className="flex-1 w-full mb-4 overflow-hidden">
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 text-sm text-gray-700 text-center flex-shrink-0">
              Click to flip
            </div>
          </div>

          {/* ─── BACK ─────────────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 flex flex-col bg-[#EDF6F3] rounded-2xl overflow-hidden select-none"
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Scrollable content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 mb-2 text-gray-700">
                <Award size={20} className="text-yellow-500" />
                <h3 className="font-semibold text-lg">Pet #{i + 1}</h3>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-black">{p.name}</h2>
              {p.photoUrl && (
                <div className="overflow-hidden rounded-md mb-4">
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className="w-full object-cover h-48"
                  />
                </div>
              )}
              <div className="bg-[#CFE7F2] text-black rounded-lg p-4">
                <h2 className="text-xl font-bold mb-2">Details</h2>
                <p>
                  <strong>Type:</strong> {p.type}
                </p>
                <p className="mt-2">
                  <strong>Description:</strong> {p.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 p-6 bg-[#EDF6F3] flex-shrink-0">
              <Button
                variant="default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(true);
                }}
                className="flex-1 py-2 rounded-md text-white bg-[#6FCF97] hover:bg-[#5BBF8A] active:bg-[#4DAF7E]"
              >
                Adopt
              </Button>
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResponse(false);
                }}
                className="flex-1 py-2 rounded-md text-white bg-[#FF6B6B] hover:bg-[#FF4C4C] active:bg-[#FF2D2D]"
              >
                Pass
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- RENDER ---------- */
  return (
    <Layout>
      <Head>
        <title>Browse Pets | PetSwipe</title>
      </Head>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center text-4xl font-extrabold text-[#234851] mt-8 dark:text-[#B6EBE9]"
      >
        Check out these pets!
      </motion.h1>

      {/*  Deck container now slides from top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative flex items-center justify-center h-full py-8 mb-8"
      >
        {/* LEFT NAV */}
        <button
          onClick={goPrev}
          disabled={index <= -1 || animating}
          className="absolute left-4 p-2 bg-white rounded-full shadow disabled:opacity-50 text-[#7097A8]"
          style={{ zIndex: 50 }}
        >
          <ArrowLeft />
        </button>

        {/* DECK */}
        <div
          className="w-full max-w-md h-[75vh] relative"
          style={{
            transform: `scale(${scale / 100})`,
            transition: "transform 0.25s ease",
            transformOrigin: "center center",
          }}
        >
          <AnimatePresence
            initial={false}
            custom={direction}
            onExitComplete={() => setAnimating(false)}
          >
            {index >= cases.length ? (
              /* DONE SLIDE */
              <motion.div
                key="done"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <div className="w-full h-full bg-[#EDF6F3] rounded-2xl p-8 flex flex-col items-center justify-center">
                  <h2 className="text-2xl font-semibold mb-4">All Done!</h2>
                  <p>You've swiped through all your matched pets.</p>
                </div>
              </motion.div>
            ) : (
              /* Deck cards including instructions when index === -1 */
              [3, 2, 1, 0].map((offset) => {
                const i = index + offset;
                if (i >= cases.length) return null;
                const layer = offset;
                const isTop = offset === 0;
                const common = {
                  position: "absolute" as const,
                  top: layer * 8,
                  left: layer * 8,
                  zIndex: 10 - layer,
                  transform: `scale(${1 - layer * 0.02})`,
                };

                const cardContent =
                  i < 0
                    ? renderInstructionCard(isTop)
                    : renderCaseFace(i, isTop);

                if (offset === 0) {
                  return (
                    <motion.div
                      key={`card-${i}`}
                      style={{ ...common, zIndex: 30 }}
                      variants={deckCardVariants}
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.35 }}
                      className="w-full h-full"
                    >
                      {cardContent}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={`card-${i}`}
                    style={common}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    {cardContent}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT NAV */}
        <button
          onClick={goNext}
          disabled={index >= cases.length || animating}
          className="absolute right-4 p-2 bg-white rounded-full shadow disabled:opacity-50 text-[#7097A8]"
          style={{ zIndex: 50 }}
        >
          <ArrowRight />
        </button>
      </motion.div>

      {/* BOTTOM TOOLBAR */}
      <TooltipProvider delayDuration={200}>
        <div
          className="relative left-1/2 -translate-x-1/2 w-screen flex justify-center
             shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.3)]"
        >
          {/* TOOLBAR */}
          <div className="flex items-center gap-8 py-4">
            {/* ALL SWIPES */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/swipes" legacyBehavior>
                  <a className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white hover:text-[#7097A8]">
                    <List size={22} />
                  </a>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white text-[#7097A8] rounded-md px-3 py-2 shadow-lg text-sm font-medium hover:text-[#7097A8]"
              >
                View all swipes
              </TooltipContent>
            </Tooltip>

            {/* ADOPTED PETS */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/liked-swipes" legacyBehavior>
                  <a className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white hover:text-[#7097A8]">
                    <Heart size={22} />
                  </a>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white text-[#7097A8] rounded-md px-3 py-2 shadow-lg text-sm font-medium hover:text-[#7097A8]"
              >
                View adopted pets
              </TooltipContent>
            </Tooltip>

            {/* TIP */}
            <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTipOpen((o) => !o)}
                  className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white hover:text-[#7097A8]"
                >
                  <Lightbulb size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white text-[#7097A8] rounded-md px-3 py-2 shadow-lg text-sm font-medium"
              >
                Tap to flip, swipe or arrow-click to navigate, then adopt or
                pass.
              </TooltipContent>
            </Tooltip>

            {/* ZOOM */}
            <Popover open={zoomOpen} onOpenChange={setZoomOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white hover:text-[#7097A8]">
                  <ZoomIn size={22} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="bg-white text-[#7097A8] rounded-xl shadow-xl w-72 p-4 space-y-4">
                <p className="text-center font-semibold">Zoom cards</p>
                <Slider
                  min={50}
                  max={150}
                  step={10}
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                  className="w-full"
                />
                <p className="text-center text-sm font-medium">{scale}%</p>
              </PopoverContent>
            </Popover>

            {/* FAQ */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.replace("/faq")}
                  className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white hover:text-[#7097A8]"
                >
                  <HelpCircle size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white text-[#7097A8] rounded-md px-3 py-2 shadow-lg text-sm font-medium"
              >
                FAQ &amp; Help
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      <Toaster />
    </Layout>
  );
};

export default Home;
