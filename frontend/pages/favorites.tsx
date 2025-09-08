import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import Head from "next/head";
import { toast } from "sonner";
import { Loader2, PawPrint, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useUser } from "@/hooks/useUser";
import { favoriteApi, Favorite } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fetchFavorites = () => favoriteApi.list();

const FavoritesPage: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const {
    data: favorites,
    error,
    isValidating,
  } = useSWR<Favorite[]>(user ? "favorites" : null, fetchFavorites);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (error) toast.error("Failed to load favorites");
  }, [error]);

  if (authLoading || isValidating || !favorites) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  if (favorites.length === 0) {
    return (
      <Layout>
        <Head>
          <title>My Favorites | PetSwipe</title>
        </Head>
        <div className="px-6 pb-12">
          <div className="max-w-2xl mx-auto text-center mt-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF6F3] text-[#234851] dark:bg-neutral-800 dark:text-[#B6EBE9]">
              <PawPrint size={26} />
            </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                No favorites yet
              </h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">
              Save pets you love to view them here later.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => router.push("/home")}
                className="bg-[#7097A8] hover:bg-[#5f868d] text-white"
              >
                Browse pets
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>My Favorites | PetSwipe</title>
      </Head>
      <div className="px-6 pb-12">
        <h1 className="text-3xl font-extrabold text-center text-[#234851] my-8 dark:text-[#B6EBE9]">
          My Favorites
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {favorites.map((fav) => {
            const { pet } = fav;
            return (
              <Card key={fav.id} className="shadow-lg">
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
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/pet/${pet.id}`)}
                    className="w-full border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
                  >
                    View details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-center mt-10">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
          >
            <ArrowLeft size={18} className="mr-2" /> Back
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default FavoritesPage;
