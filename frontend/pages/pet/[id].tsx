import React, { useMemo, useCallback } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Award, Mail, Phone, MapPin, Share2, Loader2, ArrowLeft } from "lucide-react";
import { Pet /*, petApi*/ } from "@/lib/api";

/**
 * IMPORTANT:
 * Replace `fetchPet` with your actual client/helper (e.g., `petApi.getById(id)` if available).
 * This implementation assumes an API route like GET /api/pets/:id that returns a Pet.
 */
const fetchPet = async (id: string): Promise<Pet> => {
  const res = await fetch(`/api/pets/${id}`);
  if (!res.ok) throw new Error("Failed to load pet");
  return res.json();
};

const PetPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const { data: pet, error, isLoading } = useSWR<Pet>(
    typeof id === "string" ? ["pet", id] : null,
    () => fetchPet(id as string),
    { revalidateOnFocus: false }
  );

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined" || typeof id !== "string") return "";
    return new URL(`/pet/${id}`, window.location.origin).toString();
  }, [id]);

  const contactHref = useMemo(() => {
    if (!pet) return undefined;
    const c = pet.shelterContact?.trim() || "";
    if (!c) return undefined;
    if (c.includes("@")) {
      const subject = encodeURIComponent(`Inquiry about ${pet.name} (PetSwipe)`);
      const body = encodeURIComponent(
        `Hello${pet.shelterName ? ` ${pet.shelterName}` : ""},\n\n` +
        `I'm interested in adopting ${pet.name}. Could you share next steps?\n\n` +
        `Link: ${pageUrl}\n\nThank you!`
      );
      return `mailto:${c}?subject=${subject}&body=${body}`;
    }
    const tel = c.replace(/\D/g, "");
    return tel ? `tel:${tel}` : undefined;
  }, [pet, pageUrl]);

  const share = useCallback(async () => {
    try {
      if (!pet) return;
      const shareData = {
        title: `${pet.name} | PetSwipe`,
        text: `Check out ${pet.name} available for adoption.`,
        url: pageUrl,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(pageUrl);
        toast.success("Link copied to clipboard");
      }
    } catch {
      toast.error("Couldn’t share the link");
    }
  }, [pet, pageUrl]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (error || !pet) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-6">Failed to load pet.</p>
          <Button onClick={() => router.back()} className="bg-[#7097A8] text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{pet.name} | PetSwipe</title>
        <meta name="description" content={`Learn more about ${pet.name} and contact the shelter.`} />
        {pet.photoUrl ? <meta property="og:image" content={pet.photoUrl} /> : null}
        <meta property="og:title" content={`${pet.name} | PetSwipe`} />
        <meta property="og:description" content={`Learn more about ${pet.name} and contact the shelter.`} />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.back()} className="bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <Button onClick={share} className="bg-[#234851] hover:bg-[#1b3a3f] text-white">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          {contactHref ? (
            <a href={contactHref}>
              <Button className="ml-2 bg-[#6FCF97] hover:bg-[#5BBF8A] text-white">
                <Mail className="mr-2 h-4 w-4" />
                Contact shelter
              </Button>
            </a>
          ) : null}
        </div>

        <div className="rounded-2xl shadow-lg bg-[#EDF6F3] overflow-hidden">
          {pet.photoUrl ? (
            <div className="w-full h-72 sm:h-96 overflow-hidden">
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ) : null}

          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h3 className="inline-flex items-center gap-2 text-gray-600">
                <Award size={18} /> Pet Card
              </h3>
              <h1 className="text-3xl font-bold text-gray-900 mt-1">{pet.name}</h1>
            </div>

            <div className="bg-[#CFE7F2] text-black rounded-xl p-5 space-y-3">
              <div>
                <strong>Type:</strong> {pet.type}
              </div>
              {pet.description ? (
                <div>
                  <strong>Description:</strong> {pet.description}
                </div>
              ) : null}
              <hr className="my-2" />
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>
                  <strong>Shelter:</strong> {pet.shelterName ?? "N/A"}
                </span>
              </div>
              {pet.shelterAddress ? (
                <div className="ml-6 text-sm">{pet.shelterAddress}</div>
              ) : null}
              {pet.shelterContact ? (
                <div className="flex items-center gap-2">
                  {pet.shelterContact.includes("@") ? <Mail size={18} /> : <Phone size={18} />}
                  <span>
                    <strong>Contact:</strong> {pet.shelterContact}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button onClick={share} variant="secondary" className="bg-white">
                <Share2 className="mr-2 h-4 w-4" />
                Share this pet
              </Button>
              {contactHref ? (
                <a href={contactHref} className="inline-block">
                  <Button className="bg-[#6FCF97] hover:bg-[#5BBF8A] text-white">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact shelter
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PetPage;
