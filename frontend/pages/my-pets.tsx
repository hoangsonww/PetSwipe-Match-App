import React, { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PawPrint, Pencil } from "lucide-react";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { useUser } from "@/hooks/useUser";
import { api, Pet } from "@/lib/api";

// Radix/shadcn dialog pieces
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
} from "@/components/ui/dialog";

const fetchMyPets = async (): Promise<Pet[]> => {
  const res = await api.get<Pet[]>("/pets/mine");
  return res.data;
};

const MyPetsPage: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const {
    data: pets,
    error,
    isValidating,
    mutate, // for refreshing after edit
  } = useSWR<Pet[]>(user ? "my-created-pets" : null, fetchMyPets);

  // protect
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // toast errors once when they occur
  useEffect(() => {
    if (error) toast.error("Failed to load your pets");
  }, [error]);

  // ────────────────────────────────────────────────────────────────────────────
  // Edit modal state
  // ────────────────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Pet> & { id?: string }>({});

  const startEdit = (pet: Pet) => {
    setDraft({
      id: pet.id,
      name: pet.name,
      type: pet.type,
      description: pet.description ?? "",
      photoUrl: pet.photoUrl ?? "",
      shelterName: pet.shelterName ?? "",
      shelterContact: pet.shelterContact ?? "",
      shelterAddress: pet.shelterAddress ?? "",
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!draft.id) return;
    try {
      setSaving(true);
      const body = {
        name: draft.name,
        type: draft.type,
        description: draft.description || undefined,
        photoUrl: draft.photoUrl || undefined,
        shelterName: draft.shelterName || undefined,
        shelterContact: draft.shelterContact || undefined,
        shelterAddress: draft.shelterAddress || undefined,
      };
      await api.put(`/pets/${draft.id}`, body);
      toast.success("Pet updated");
      setOpen(false);
      await mutate(); // refresh list
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to update the pet";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || isValidating || !pets) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  // Empty state
  if (pets.length === 0) {
    return (
      <Layout>
        <Head>
          <title>My Pets | PetSwipe</title>
        </Head>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-extrabold text-center text-[#234851] my-8 dark:text-[#B6EBE9]"
        >
          Pets You Created
        </motion.h1>

        <div className="px-6 pb-12">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF6F3] text-[#234851] dark:bg-neutral-800 dark:text-[#B6EBE9]">
                <PawPrint size={26} />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                You haven’t added any pets yet
              </h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                Add a pet to get started, or bulk upload a CSV.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => router.push("/addPet")}
                  className="bg-[#7097A8] hover:bg-[#5f868d] text-white"
                >
                  Add single pet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/bulk-upload")}
                  className="border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
                >
                  Bulk upload CSV
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
        <title>My Pets | PetSwipe</title>
      </Head>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-extrabold text-center text-[#234851] my-8 dark:text-[#B6EBE9]"
      >
        Pets You Created
      </motion.h1>

      <div className="grid gap-6 px-6 pb-12 sm:grid-cols-2 md:grid-cols-3">
        {pets.map((pet) => (
          <Card key={pet.id} className="shadow-lg relative">
            {/* Edit icon button */}
            <button
              onClick={() => startEdit(pet)}
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-md p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 shadow-sm"
              aria-label={`Edit ${pet.name}`}
            >
              <Pencil size={16} />
            </button>

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
                Created on{" "}
                {new Date(pet.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </p>

              <Button
                variant="outline"
                onClick={() => router.push(`/pet/${pet.id}`)}
                className="w-full col-span-2 sm:col-span-1 border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
              >
                View details
              </Button>
            </CardContent>
          </Card>
        ))}
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

      {/* ────────────────────────────────────────────────────────────────────────
          Edit Pet Modal (solid backdrop, styled content)
          ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Solid backdrop (not transparent) */}
        <DialogOverlay className="fixed inset-0 bg-black/70 backdrop-blur-[2px]" />
        <DialogContent className="max-w-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Pet
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.name ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Buddy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.type ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, type: e.target.value }))
                }
                placeholder="Dog, Cat…"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8] resize-y"
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="Temperament, age, color, notes…"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Photo URL</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.photoUrl ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, photoUrl: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Shelter Name</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.shelterName ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shelterName: e.target.value }))
                }
                placeholder="Happy Tails Rescue"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Shelter Contact</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.shelterContact ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shelterContact: e.target.value }))
                }
                placeholder="email@rescue.org or (555) 555-5555"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Shelter Address</label>
              <input
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-[#7097A8]"
                value={draft.shelterAddress ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, shelterAddress: e.target.value }))
                }
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !draft.name || !draft.type}
              className="bg-[#7097A8] hover:bg-[#5f868d] text-white disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MyPetsPage;
