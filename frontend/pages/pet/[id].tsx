import React, { useMemo, useCallback, useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Award,
  Mail,
  Phone,
  MapPin,
  Share2,
  Loader2,
  ArrowLeft,
  Facebook,
  Twitter,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { Pet, Swipe, Favorite } from "@/lib/api"; // interface only
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useUser } from "@/hooks/useUser";
import { swipeApi, favoriteApi } from "@/lib/api";

// ──────────────────────────────────────────────────────────────────────────────
// Data: fetch via Next.js API proxy to avoid CORS
// ──────────────────────────────────────────────────────────────────────────────
const fetchPetViaProxy = async ([, id]: readonly [
  string,
  string,
]): Promise<Pet> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  const res = await fetch(`/api/pets/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load pet");
  return res.json();
};

const PetPage: NextPage = () => {
  const router = useRouter();
  const rid = router.query.id;
  const petId = Array.isArray(rid) ? rid[0] : rid;
  const routeReady = router.isReady && typeof petId === "string";

  const {
    data: pet,
    error,
    isLoading,
  } = useSWR<Pet>(
    routeReady ? (["pet", petId as string] as const) : null,
    fetchPetViaProxy,
    { revalidateOnFocus: false },
  );

  const { user } = useUser();
  const { data: mySwipes } = useSWR<Swipe[]>(
    user ? "my-swipes" : null,
    () => swipeApi.listMySwipes(),
    { revalidateOnFocus: false },
  );
  const hasDecision = !!pet && !!mySwipes?.some((s) => s?.pet?.id === pet.id);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && pet?.id) {
      favoriteApi
        .list()
        .then((favs) => {
          setFavorited(favs.some((f) => f.pet.id === pet.id));
        })
        .catch(() => {});
    }
  }, [user, pet?.id]);
  const handleDecision = useCallback(
    async (liked: boolean) => {
      if (!pet?.id) return;
      try {
        setSaving(true);
        await swipeApi.recordSwipe(pet.id, liked);
        toast.success(liked ? "Marked as adopted" : "Marked as passed");
      } catch {
        toast.error("Failed to save your decision");
      } finally {
        setSaving(false);
      }
    },
    [pet],
  );

  const toggleFavorite = useCallback(async () => {
    if (!pet?.id) return;
    try {
      setFavLoading(true);
      if (favorited) {
        await favoriteApi.remove(pet.id);
        setFavorited(false);
        toast.success("Removed from favorites");
      } else {
        await favoriteApi.add(pet.id);
        setFavorited(true);
        toast.success("Added to favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    } finally {
      setFavLoading(false);
    }
  }, [favorited, pet]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined" || typeof petId !== "string") return "";
    return new URL(`/pet/${petId}`, window.location.origin).toString();
  }, [petId]);

  const photoSrc = useMemo(() => {
    if (pet?.photoUrl?.trim()) return pet.photoUrl!;
    const label = pet?.name ? encodeURIComponent(pet.name) : "No Photo";
    // neutral placeholder so it looks fine in dark/light
    return `https://placehold.co/800x1000/111827/FFFFFF?font=inter&text=${label}`;
  }, [pet]);

  const contactHref = useMemo(() => {
    if (!pet) return undefined;
    const c = (pet.shelterContact || "").trim();
    if (!c) return undefined;

    if (c.includes("@")) {
      const subject = encodeURIComponent(
        `Inquiry about ${pet.name} (PetSwipe)`,
      );
      const body = encodeURIComponent(
        `Hello${pet.shelterName ? ` ${pet.shelterName}` : ""},\n\n` +
          `I'm interested in adopting ${pet.name}. Could you share next steps?\n\n` +
          `Link: ${pageUrl}\n\nThank you!`,
      );
      return `mailto:${c}?subject=${subject}&body=${body}`;
    }
    const tel = c.replace(/\D/g, "");
    return tel ? `tel:${tel}` : undefined;
  }, [pet, pageUrl]);

  // Share dropdown actions
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn’t copy the link");
    }
  }, [pageUrl]);

  const shareEmail = useCallback(() => {
    const subject = encodeURIComponent(`Check out ${pet?.name} on PetSwipe`);
    const body = encodeURIComponent(
      `Hey,\n\nFound ${pet?.name} on PetSwipe:\n${pageUrl}\n\n`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [pet?.name, pageUrl]);

  const shareFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [pageUrl]);

  const shareX = useCallback(() => {
    const text = `Check out ${pet?.name} available for adoption`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      pageUrl,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [pet?.name, pageUrl]);

  // Prevent flash by waiting for the route to be ready and for the first load state
  if (!routeReady || isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 dark:text-teal-400" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 dark:text-red-400 mb-6">
            Failed to load pet.
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
        </div>
      </Layout>
    );
  }

  if (!pet) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600 dark:text-teal-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{pet.name} | PetSwipe</title>
        <meta
          name="description"
          content={`Learn more about ${pet.name} and contact the shelter.`}
        />
        {photoSrc ? <meta property="og:image" content={photoSrc} /> : null}
        <meta property="og:title" content={`${pet.name} | PetSwipe`} />
        <meta
          property="og:description"
          content={`Learn more about ${pet.name} and contact the shelter.`}
        />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Banner (Facebook-style cover) with rounded corners + animated gradient */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="animated-gradient rounded-2xl overflow-hidden">
          <div className="px-4 py-10 sm:py-14">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl ring-4 ring-white dark:ring-neutral-900 overflow-hidden shadow-lg">
                    <img
                      src={photoSrc}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  </div>
                </div>
                <div className="text-white">
                  <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                    {pet.name}
                  </h1>
                  <div className="mt-1">
                    <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                      {pet.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                {/* Share dropdown on banner */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="bg-white/95 hover:bg-white text-teal-800 dark:text-teal-900 dark:bg-white/90">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-xl shadow-xl w-64 p-2 space-y-1 border border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Copy size={18} />
                      <span>Copy link</span>
                    </button>
                    <button
                      onClick={shareEmail}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Mail size={18} />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={shareFacebook}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Facebook size={18} />
                      <span>Share to Facebook</span>
                    </button>
                    <button
                      onClick={shareX}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Twitter size={18} />
                      <span>Share to X</span>
                    </button>
                  </PopoverContent>
                </Popover>

                {contactHref ? (
                  <a href={contactHref}>
                    <Button className="bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500">
                      <Mail className="h-4 w-4" />
                      Contact shelter
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT: photo + quick actions */}
          <aside className="md:col-span-1">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden sticky md:top-6">
              <div className="w-full h-80 sm:h-[28rem] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={photoSrc}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>

              <div className="p-4 flex flex-col gap-2">
                {/* Secondary share */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="secondary"
                      className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-xl shadow-xl w-64 p-2 space-y-1 border border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Copy size={18} />
                      <span>Copy link</span>
                    </button>
                    <button
                      onClick={shareEmail}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Mail size={18} />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={shareFacebook}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Facebook size={18} />
                      <span>Share to Facebook</span>
                    </button>
                    <button
                      onClick={shareX}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    >
                      <Twitter size={18} />
                      <span>Share to X</span>
                    </button>
                  </PopoverContent>
                </Popover>

                {contactHref ? (
                  <a href={contactHref}>
                    <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500">
                      <Mail className="h-4 w-4" />
                      Contact shelter
                    </Button>
                  </a>
                ) : null}

                {pet.shelterAddress ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps?q=${encodeURIComponent(pet.shelterAddress!)}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                  >
                    <MapPin className="h-4 w-4" />
                    Open in Maps
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>

          {/* RIGHT: details */}
          <main className="md:col-span-2 space-y-6">
            {/* Profile header card */}
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                <Award size={18} />
                <span className="font-medium">Pet Profile</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-2">
                {pet.name}
              </h2>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {pet.type}
                </span>
              </div>
            </div>

            {/* About / details */}
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              {/* About */}
              {pet.description ? (
                <div className="p-6 sm:p-8 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                    About {pet.name}
                  </h3>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {pet.description}
                  </p>
                </div>
              ) : null}

              {/* Grid info */}
              <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Shelter
                  </h4>
                  <div className="space-y-2 text-neutral-700 dark:text-neutral-300">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {pet.shelterName || "N/A"}
                    </div>
                    {pet.shelterAddress ? (
                      <div>
                        <span className="font-medium">Address:</span>{" "}
                        {pet.shelterAddress}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Contact
                  </h4>
                  {pet.shelterContact ? (
                    <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      {pet.shelterContact.includes("@") ? (
                        <Mail size={18} />
                      ) : (
                        <Phone size={18} />
                      )}
                      <span>{pet.shelterContact}</span>
                    </div>
                  ) : (
                    <div className="text-neutral-500 dark:text-neutral-400">
                      N/A
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────
                Adopt / Pass (only if the current user has not decided yet)
               ──────────────────────────────────────────────────────────────── */}
            {user && !hasDecision ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={() => handleDecision(true)}
                  disabled={saving}
                  className="flex-1 bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Adopt
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDecision(false)}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-400"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Pass
                </Button>
              </div>
            ) : null}

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
                  >
                    <Share2 className="h-4 w-4" />
                    Share this pet
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-xl shadow-xl w-64 p-2 space-y-1 border border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    <Copy size={18} />
                    <span>Copy link</span>
                  </button>
                  <button
                    onClick={shareEmail}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    <Mail size={18} />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={shareFacebook}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    <Facebook size={18} />
                    <span>Share to Facebook</span>
                  </button>
                  <button
                    onClick={shareX}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                  >
                    <Twitter size={18} />
                    <span>Share to X</span>
                  </button>
                </PopoverContent>
              </Popover>

              <Button
                variant="secondary"
                onClick={toggleFavorite}
                disabled={favLoading}
                className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
              >
                {favLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {favorited ? "Unfavorite" : "Favorite"}
              </Button>

              {contactHref ? (
                <a href={contactHref} className="inline-block">
                  <Button className="bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500">
                    <Mail className="h-4 w-4" />
                    Contact shelter
                  </Button>
                </a>
              ) : null}
            </div>
          </main>
        </div>
      </div>

      {/* Animated gradient styles (light + dark) */}
      <style jsx>{`
        .animated-gradient {
          background: linear-gradient(
            90deg,
            #0f766e,
            #06b6d4,
            #2563eb,
            #0f766e
          );
          background-size: 300% 300%;
          animation: gradientShift 20s ease infinite;
        }
        @keyframes gradientShift {
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
        :global(.dark) .animated-gradient {
          background: linear-gradient(
            90deg,
            #115e59,
            #0891b2,
            #1e3a8a,
            #115e59
          );
        }
      `}</style>
    </Layout>
  );
};

export default PetPage;
