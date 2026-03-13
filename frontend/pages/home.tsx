import React, { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import { matchApi, swipeApi, petApi, Pet, Match, DeckResponse } from "@/lib/api";
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
  MapPin,
  Phone,
  Mail,
  Share2,
  Facebook,
  Twitter,
  Copy,
  PhoneCall,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";
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

const fetchMatches = () => matchApi.listMyMatches();
const fetchDeck = () => petApi.getDeck({ limit: 30 });
const pageVariants = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? 300 : -300, opacity: 0 }),
};

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
  
  // Feature flag to test new relevance engine - can be toggled via URL param
  const useRelevanceEngine = router.query.engine === 'v1' || false;
  
  // Legacy match-based system
  const { data: matches, error: matchError } = useSWR<Match[]>(
    user && !useRelevanceEngine ? "matches" : null,
    fetchMatches,
  );

  // New personalized deck system  
  const { data: deckResponse, error: deckError } = useSWR<DeckResponse>(
    user && useRelevanceEngine ? "deck" : null,
    fetchDeck,
  );

  const [cases, setCases] = useState<Pet[]>([]);
  useEffect(() => {
    if (useRelevanceEngine && deckResponse?.items) {
      // Convert DeckItems to Pet format for compatibility
      const pets: Pet[] = deckResponse.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        ageMonths: item.ageMonths,
        approxBreed: item.breed,
        description: item.description,
        photoUrl: item.photoUrl,
        shelterName: item.shelterName || '',
        shelterContact: item.shelterContact,
        shelterAddress: item.shelterAddress,
        matches: [],
        swipes: [],
        createdAt: item.createdAt,
        updatedAt: item.createdAt, // Fallback
      }));
      setCases(pets);
    } else if (!useRelevanceEngine && matches) {
      setCases(matches.map((m) => m.pet));
    }
  }, [matches, deckResponse, useRelevanceEngine]);

  const [index, setIndex] = useState(-1); // start with instructions
  const [flipped, setFlipped] = useState(false);
  const [scale, setScale] = useState(100);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  const lastSwipeRef = useRef(0);

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (animating) return;
      lastSwipeRef.current = Date.now();
      if (index < 0) {
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
      if (index >= 0) goPrev();
    },
    delta: 20,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (animating) return;
      if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animating, index, cases]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const handleResponse = async (liked: boolean) => {
    if (index < 0 || index >= cases.length) return;
    const petId = cases[index].id;

    try {
      await swipeApi.recordSwipe(petId, liked);
      toast.success("Choice recorded");

      setCases((prev) => {
        const copy = [...prev];
        copy.splice(index, 1);
        return copy;
      });
      setFlipped(false);
      setAnimating(false);
      setIndex((prev) => {
        return prev >= cases.length - 1 ? prev : prev;
      });
    } catch {
      toast.error("Failed to record, please retry");
    }
  };

  const error = useRelevanceEngine ? deckError : matchError;
  const hasData = useRelevanceEngine 
    ? (deckResponse?.items?.length ?? 0) > 0 
    : (matches?.length ?? 0) > 0;

  if (error) {
    return (
      <Layout>
        <div className="text-center mt-20">
          <p className="text-red-600">Error loading pets</p>
          {useRelevanceEngine && (
            <p className="text-sm text-gray-500 mt-2">
              Try the <a href="/home" className="text-blue-600 underline">legacy system</a>
            </p>
          )}
        </div>
      </Layout>
    );
  }
  
  if (!hasData && (index < 0 || cases.length === 0)) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-20 w-20 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  const renderInstructionCard = (isTop: boolean) => (
    <div
      className="
      relative
      w-full
      h-full
      rounded-2xl
      shadow-lg
      bg-[#EDF6F3]
      flex
      flex-col
      items-start
      justify-start
      p-8
      cursor-grab
      active:cursor-grabbing
      overflow-y-auto
    "
      style={{ perspective: 1000 }}
      {...(isTop ? swipeHandlers : {})}
      onClick={isTop ? goNext : undefined}
    >
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Instructions
      </h2>

      <div className="flex-1 w-full text-gray-700 space-y-4">
        <p>On the following page, you will see pets available for adoption.</p>
        <p>
          Swipe right or left to navigate through the pets. For each pet, click
          on its card to flip it and see more details, including a photo,
          description, and contact information for the shelter.
        </p>
        <p>
          Press the Adopt button on the back of the card if you like the pet, or
          the Pass button if you do not like the pet.
        </p>
        <p>
          <strong>IMPORTANT: </strong>
          Once you have made your choice on a pet, you will not be able to go
          back and edit it. We want you to be sure about your choices!
        </p>
        <p>
          If you reach the end, take your time to review your choices as we work
          to add more pets to the app.
        </p>
      </div>

      <div className="mt-4 self-center">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="
          bg-[#7097A8]
          hover:bg-[#5f868d]
          text-white
          flex
          items-center
          gap-2
          px-6
          py-2
        "
        >
          Start
        </Button>
      </div>
    </div>
  );

  const renderCaseFace = (i: number, isTop: boolean) => {
    const p = cases[i];

    const handleCardClick = () => {
      const sinceSwipe = Date.now() - lastSwipeRef.current;
      if (sinceSwipe < 180) return;
      setFlipped((f) => !f);
    };

    // -------------------- Robust contact parsing & formatting --------------------
    const rawContact = (p.shelterContact ?? "").trim();

    // Email(s)
    const emailMatches =
      rawContact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    const primaryEmail = emailMatches[0] || "";
    const primaryEmailHref = primaryEmail
      ? `mailto:${primaryEmail}?subject=${encodeURIComponent(
          `Inquiry about ${p.name}`,
        )}`
      : undefined;

    // Find the best phone-like candidate (longest by digit count), incl. optional extension
    const phoneCandidateRegex =
      /(?:(?:\+?\d[\d\s().-]{6,}\d))(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?/gi;

    const candidates = Array.from(rawContact.matchAll(phoneCandidateRegex)).map(
      (m) => m[0],
    );

    const byDigitCount = (s: string) => (s.match(/\d/g) || []).length;
    const phoneRaw =
      candidates.sort((a, b) => byDigitCount(b) - byDigitCount(a))[0] || "";

    // Extract extension if present
    const extMatch = phoneRaw.match(
      /(?:^|\s)(?:x|ext\.?|extension)\s*(\d{1,6})/i,
    );
    const ext = extMatch?.[1] || "";

    // Core number (strip extension text)
    const phoneCore = phoneRaw
      .replace(/(?:^|\s)(?:x|ext\.?|extension)\s*\d{1,6}\s*$/i, "")
      .trim();

    // Detect if it had a leading '+'
    const hadPlus =
      /^\s*\+/.test(phoneCore) ||
      /^\s*\+/.test(phoneRaw) ||
      /^\s*\+/.test(rawContact);

    // Digits only (for parsing)
    const digits = (phoneCore.match(/\d+/g) || []).join("");

    // Split into CC + NSN (heuristic)
    let cc = "";
    let nsn = digits;

    if (hadPlus && digits.length > 10) {
      for (let k = 1; k <= 3; k++) {
        const maybeCC = digits.slice(0, k);
        const rest = digits.slice(k);
        if (rest.length >= 10) {
          cc = maybeCC;
          nsn = rest;
          break;
        }
      }
      if (!cc) {
        cc = digits.slice(0, 1);
        nsn = digits.slice(1);
      }
    }

    // Format display (US-like last 10 digits) or best effort
    const last10 = nsn.slice(-10);
    let displayPhone = "";
    if (last10.length === 10) {
      const a = last10.slice(0, 3);
      const b = last10.slice(3, 6);
      const c = last10.slice(6);
      displayPhone = cc ? `+${cc} (${a}) ${b}-${c}` : `(${a}) ${b}-${c}`;
    } else if (nsn.length >= 7) {
      const a = nsn.slice(0, 3);
      const b = nsn.slice(3, 6);
      const c = nsn.slice(6);
      displayPhone = cc ? `+${cc} (${a}) ${b}-${c}` : `(${a}) ${b}-${c}`;
    } else if (nsn.length > 0) {
      displayPhone = nsn;
    } else {
      displayPhone = "";
    }

    // tel: href
    const telNumeric = (hadPlus ? `+${cc}${nsn}` : digits) || "";
    const primaryPhoneHref =
      telNumeric.length > 0
        ? `tel:${telNumeric}${ext ? `;ext=${ext}` : ""}`
        : undefined;

    // -------------------- Contact dropdown handlers --------------------
    const openMaps = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!p.shelterAddress) {
        toast.info("No address available for this shelter");
        return;
      }
      const url = `https://www.google.com/maps?q=${encodeURIComponent(
        p.shelterAddress,
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
    };

    const callShelter = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!primaryPhoneHref) {
        toast.info("No phone number available");
        return;
      }
      window.location.href = primaryPhoneHref;
    };

    const emailShelter = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!primaryEmailHref) {
        toast.info("No email available");
        return;
      }
      window.location.href = primaryEmailHref;
    };

    // -------------------- Share helpers (unique details page) --------------------
    const pageUrl =
      typeof window !== "undefined"
        ? new URL(`/pet/${p.id}`, window.location.origin).toString()
        : "";

    const copyLink = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(pageUrl);
        toast.success("Link copied to clipboard");
      } catch {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = pageUrl;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast.success("Link copied to clipboard");
        } catch {
          toast.error("Couldn’t copy the link");
        } finally {
          document.body.removeChild(ta);
        }
      }
    };

    const shareEmailLink = (e: React.MouseEvent) => {
      e.stopPropagation();
      const subject = encodeURIComponent(`Check out ${p.name} on PetSwipe`);
      const body = encodeURIComponent(
        `Hey,\n\nFound ${p.name} on PetSwipe and thought you might like to see:\n${pageUrl}\n\n`,
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const shareFacebook = (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        pageUrl,
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
    };

    const shareX = (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = `Check out ${p.name} available for adoption`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text,
      )}&url=${encodeURIComponent(pageUrl)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    };

    // -------------- Image placeholders & error fallbacks (front/back) --------------
    const frontPlaceholder = `https://placehold.co/800x600?text=${encodeURIComponent(
      p.name || "No Photo",
    )}`;
    const backPlaceholder = `https://placehold.co/640x384?text=${encodeURIComponent(
      p.name || "No Photo",
    )}`;

    return (
      <div
        className="
        relative
        w-full max-w-[95vw] sm:max-w-none mx-auto
        h-full max-h-screen
        cursor-grab active:cursor-grabbing
        z-40
      "
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
          {/* FRONT */}
          <div
            className="absolute inset-0 flex flex-col p-6 bg-[#EDF6F3] rounded-2xl select-none overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="text-center mb-4 flex-shrink-0">
              <h3 className="flex items-center justify-center gap-2 text-gray-600">
                <Award size={20} /> Pet #{i + 1}
              </h3>
              <p className="text-3xl font-bold text-gray-800">{p.name}</p>
            </div>

            <div className="flex-1 w-full mb-4 overflow-hidden">
              <img
                src={p.photoUrl?.trim() ? p.photoUrl : frontPlaceholder}
                alt={p.name}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src !== frontPlaceholder) {
                    target.src = frontPlaceholder;
                  }
                }}
              />
            </div>

            <div className="mt-2 text-sm text-gray-700 text-center flex-shrink-0">
              Click to flip
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 flex flex-col bg-[#EDF6F3] rounded-2xl overflow-hidden select-none pt-2"
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 mb-2 text-gray-700">
                <Award size={20} className="text-yellow-500" />
                <h3 className="font-semibold text-lg">Pet #{i + 1}</h3>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-black">{p.name}</h2>

              <div className="overflow-hidden rounded-md mb-4">
                <img
                  src={p.photoUrl?.trim() ? p.photoUrl : backPlaceholder}
                  alt={p.name}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full object-cover h-48"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== backPlaceholder) {
                      target.src = backPlaceholder;
                    }
                  }}
                />
              </div>

              <div className="bg-[#CFE7F2] text-black rounded-lg p-4 space-y-2">
                <h2 className="text-xl font-bold mb-2">Details</h2>
                <p>
                  <strong>Type:</strong> {p.type}
                </p>
                <p>
                  <strong>Description:</strong> {p.description}
                </p>
                <hr className="my-2" />
                <p>
                  <strong>Shelter:</strong> {p.shelterName ?? "N/A"}
                </p>

                {/* Phone then Email (uniform display) */}
                {displayPhone || primaryEmail ? (
                  <>
                    {displayPhone && (
                      <p>
                        <strong>Phone:</strong> {displayPhone}
                      </p>
                    )}
                    {primaryEmail && (
                      <p>
                        <strong>Email:</strong> {primaryEmail}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    <strong>Contact:</strong> N/A
                  </p>
                )}

                {p.shelterAddress && (
                  <p>
                    <strong>Address:</strong> {p.shelterAddress ?? "N/A"}
                  </p>
                )}
              </div>

              {/* Contact Shelter dropdown (opaque) */}
              <div className="pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="
          w-full px-4 py-3 rounded-md font-medium
          bg-[#234851] hover:bg-[#1b3a3f] text-white
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#234851]
          flex items-center justify-center gap-2
        "
                    >
                      <PhoneCall className="h-4 w-4 shrink-0" />
                      <span className="leading-none">Contact shelter</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    onClick={(e) => e.stopPropagation()}
                    className="
                    bg-white text-[#234851] rounded-xl shadow-xl
                    w-64 p-2 space-y-1
                  "
                  >
                    <button
                      onClick={openMaps}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                      disabled={!p.shelterAddress}
                    >
                      <MapPin size={18} />
                      <span>Get address (Maps)</span>
                    </button>

                    <button
                      onClick={callShelter}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                      disabled={!primaryPhoneHref}
                    >
                      <Phone size={18} />
                      <span>Call</span>
                    </button>

                    {primaryEmailHref ? (
                      <button
                        onClick={emailShelter}
                        className="
                        w-full flex items-center gap-2 px-3 py-2 rounded-md
                        hover:bg-[#EDF6F3] transition
                      "
                      >
                        <Mail size={18} />
                        <span>Send email</span>
                      </button>
                    ) : null}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Share dropdown (opaque) */}
              <div className="pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="
                      w-full px-4 py-2 rounded-md font-medium
                      bg-white hover:bg-gray-100 text-[#234851]
                      border border-[#234851]/10
                      flex items-center justify-center gap-2
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#234851]
                    "
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    onClick={(e) => e.stopPropagation()}
                    className="
                    bg-white text-[#234851] rounded-xl shadow-xl
                    w-64 p-2 space-y-1
                  "
                  >
                    <button
                      onClick={copyLink}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                    "
                    >
                      <Copy size={18} />
                      <span>Copy link</span>
                    </button>

                    <button
                      onClick={shareEmailLink}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                    "
                    >
                      <Mail size={18} />
                      <span>Email</span>
                    </button>

                    <button
                      onClick={shareFacebook}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                    "
                    >
                      <Facebook size={18} />
                      <span>Share to Facebook</span>
                    </button>

                    <button
                      onClick={shareX}
                      className="
                      w-full flex items-center gap-2 px-3 py-2 rounded-md
                      hover:bg-[#EDF6F3] transition
                    "
                    >
                      <Twitter size={18} />
                      <span>Share to X</span>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* view details button */}
              <div className="pt-2 w-full">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/pet/${p.id}`);
                  }}
                  className="
      w-full justify-center gap-2
      bg-white text-[#234851]
      dark:bg-neutral-800 dark:text-neutral-100
      border border-[#234851]/20 dark:border-neutral-700
      rounded-xl shadow-sm
      hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:shadow-md
      active:scale-[0.99]
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-[#234851]/40 focus-visible:ring-offset-2
      focus-visible:ring-offset-[#EDF6F3]
      transition-colors transition-shadow duration-200
    "
                >
                  <List size={18} className="opacity-80" />
                  <span className="font-semibold tracking-wide">
                    View details
                  </span>
                </Button>
              </div>
            </div>

            {/* Bottom actions (unchanged) */}
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

  return (
    <Layout>
      <Head>
        <title>Browse Pets | PetSwipe</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center text-4xl font-extrabold text-[#234851] mt-8 dark:text-[#B6EBE9]"
      >
        Check out these pets!
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative flex items-center justify-center h-full py-8 mb-8 z-20"
      >
        <button
          onClick={goPrev}
          disabled={index <= -1 || animating}
          className="absolute left-4 p-2 bg-white rounded-full shadow disabled:opacity-50 text-[#7097A8]"
          style={{ zIndex: 50 }}
        >
          <ArrowLeft />
        </button>

        <div
          className="relative w-[95vw] max-w-md mx-auto h-[75vh] z-20"
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
                  <p>
                    You've swiped through all the pets. Please check back later
                    for more! 🐱
                  </p>
                </div>
              </motion.div>
            ) : (
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
                      style={{
                        ...common,
                        zIndex: 30,
                        willChange: "transform, opacity",
                      }}
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

        <button
          onClick={goNext}
          disabled={index >= cases.length || animating}
          className="absolute right-4 p-2 bg-white rounded-full shadow disabled:opacity-50 text-[#7097A8]"
          style={{ zIndex: 50 }}
        >
          <ArrowRight />
        </button>
      </motion.div>

      <TooltipProvider delayDuration={200}>
        <div
          className="relative left-1/2 -translate-x-1/2 w-screen flex justify-center z-10
             shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.3)]"
        >
          <div className="flex items-center gap-8 py-4">
            {/* System indicator */}
            <div className="text-xs text-white/70 bg-black/20 px-2 py-1 rounded">
              {useRelevanceEngine ? 'Relevance Engine v1' : 'Legacy System'}
              {useRelevanceEngine && deckResponse?.meta && (
                <span className="ml-1" title="Cache hit">
                  {deckResponse.meta.cacheHit ? '⚡' : '🔄'}
                </span>
              )}
            </div>
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
                className="
                  bg-white text-[#7097A8] rounded-md px-3 py-2 shadow-lg
                  text-sm font-medium
                  max-w-[75vw] whitespace-normal break-words
                "
              >
                Tap the card to flip it over and view full pet details. Swipe
                left or right - or use the ◀️/▶️ arrows - to move between cards.
                On the back, click “Adopt” or “Pass” to record your choice. Once
                you select, your decision is final, so choose thoughtfully!
              </TooltipContent>
            </Tooltip>

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
    </Layout>
  );
};

export default Home;
