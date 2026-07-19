import React, { useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { AdoptionApplicationForm } from "@/components/AdoptionApplicationForm";
import { useUser } from "@/hooks/useUser";
import type { Pet } from "@/lib/api";

const fetchPetViaProxy = async ([, id]: readonly [string, string]): Promise<Pet> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  const res = await fetch(`/api/pets/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load pet");
  return res.json();
};

const ApplyPage: NextPage = () => {
  const router = useRouter();
  const rid = router.query.id;
  const petId = Array.isArray(rid) ? rid[0] : rid;
  const routeReady = router.isReady && typeof petId === "string";

  const { user, loading: authLoading } = useUser();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/pet/${petId ?? ""}/apply`);
    }
  }, [authLoading, user, router, petId]);

  const { data: pet, isLoading } = useSWR<Pet>(
    routeReady ? (["pet", petId as string] as const) : null,
    fetchPetViaProxy,
    { revalidateOnFocus: false },
  );

  if (authLoading || !user || !routeReady) return null;

  return (
    <Layout>
      <Head>
        <title>
          {pet ? `Apply to Adopt ${pet.name} | PetSwipe` : "Apply | PetSwipe"}
        </title>
      </Head>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-2xl px-6 py-12"
      >
        <Button
          type="button"
          variant="ghost"
          className="mb-6"
          onClick={() => router.push(`/pet/${petId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to pet profile
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#234851] dark:text-[#B6EBE9]" />
          </div>
        ) : (
          <AdoptionApplicationForm petId={petId as string} petName={pet?.name} />
        )}
      </motion.div>
    </Layout>
  );
};

export default ApplyPage;
