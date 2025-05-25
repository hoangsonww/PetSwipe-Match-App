import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import Head from "next/head";
import { useUser } from "@/hooks/useUser";
import { swipeApi, Swipe } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

  if (authLoading || isValidating || !swipes) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (error) {
    toast.error("Failed to load your liked pets");
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
        {swipes.map((swipe) => (
          <Card key={swipe.id} className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-[#234851] dark:text-[#B6EBE9]">
                {swipe.pet.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {swipe.pet.photoUrl && (
                <img
                  src={swipe.pet.photoUrl}
                  alt={swipe.pet.name}
                  className="w-full h-40 object-cover rounded-lg"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}
              <p>
                <strong>Type:</strong> {swipe.pet.type}
              </p>
              <p>
                <strong>Description:</strong> {swipe.pet.description}
              </p>
              <p className="text-sm text-gray-500">
                Adopted on{" "}
                {new Date(swipe.swipedAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Toaster position="bottom-right" />
    </Layout>
  );
};

export default LikedSwipesPage;
