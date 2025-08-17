import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PawPrint } from "lucide-react";
import Head from "next/head";
import { useUser } from "@/hooks/useUser";
import { swipeApi, Swipe } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetchLikedSwipes = () => swipeApi.listMyLikedSwipes();

const LikedSwipesPage: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const {
    data: swipes,
    error,
    isValidating,
  } = useSWR<Swipe[]>(user ? "my-liked-swipes" : null, fetchLikedSwipes);

  // protect
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // toast errors once when they occur
  useEffect(() => {
    if (error) toast.error("Failed to load your adopted pets");
  }, [error]);

  if (authLoading || isValidating || !swipes) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  // Empty state when no liked swipes
  if (swipes.length === 0) {
    return (
      <Layout>
        <Head>
          <title>Adopted Pets | PetSwipe</title>
        </Head>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-extrabold text-center text-[#234851] my-8 dark:text-[#B6EBE9]"
        >
          My Adopted Pets
        </motion.h1>

        <div className="px-6 pb-12">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF6F3] text-[#234851] dark:bg-neutral-800 dark:text-[#B6EBE9]">
                <PawPrint size={26} />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                No adopted pets yet
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                You haven’t liked any pets. Head to the deck to start browsing!
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => router.push("/home")}
                  className="bg-[#7097A8] hover:bg-[#5f868d] text-white"
                >
                  Browse pets
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  aria-label="Back"
                  className="border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
                >
                  <ArrowLeft size={18} className="mr-2" /> Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Adopted Pets | PetSwipe</title>
      </Head>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-extrabold text-center text-[#234851] my-8 dark:text-[#B6EBE9]"
      >
        My Adopted Pets
      </motion.h1>

      <div className="grid gap-6 px-6 pb-12 sm:grid-cols-2 md:grid-cols-3">
        {swipes.map((swipe) => {
          const { pet } = swipe;
          return (
            <Card key={swipe.id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg text-[#234851] dark:text-[#B6EBE9]">
                  {pet.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pet.photoUrl && (
                  <img
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="w-full h-40 object-cover rounded-lg"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}

                <p>
                  <strong>Type:</strong> {pet.type}
                </p>

                {pet.description && (
                  <p>
                    <strong>Description:</strong> {pet.description}
                  </p>
                )}

                {/* Shelter details */}
                {pet.shelterName && (
                  <p>
                    <strong>Shelter:</strong> {pet.shelterName}
                  </p>
                )}
                {pet.shelterContact && (
                  <p>
                    <strong>Contact:</strong> {pet.shelterContact}
                  </p>
                )}
                {pet.shelterAddress && (
                  <p>
                    <strong>Address:</strong> {pet.shelterAddress}
                  </p>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adopted on{" "}
                  {new Date(swipe.swipedAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </p>

                {/* View details button (same style as My Pets page) */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/pet/${pet.id}`)}
                    className="w-full border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
                  >
                    View details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pb-12">
        <Button
          variant="outline"
          onClick={() => router.push("/home")}
          className="bg-[#7097A8] text-white hover:bg-[#5f868d] border-none"
        >
          <ArrowLeft size={18} /> Back to Home
        </Button>
      </div>
    </Layout>
  );
};

export default LikedSwipesPage;
