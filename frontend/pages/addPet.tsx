import React, { useState, useEffect, useRef } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import Head from "next/head";
import { Loader2 } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { petApi } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AddPet: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || !user) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !breed.trim() || !photoFile) {
      toast.error("Name, breed/type and a photo are required");
      return;
    }
    try {
      setSubmitting(true);
      // 1) create pet
      const { pet } = await petApi.createPet({
        name: name.trim(),
        type: breed.trim(),
        description: description.trim(),
      });
      // 2) upload photo
      await petApi.uploadPetPhoto(pet.id, photoFile);
      toast.success("Pet added successfully");
      router.push("/home");
    } catch {
      toast.error("Failed to add pet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Add Pet | PetSwipe</title>
      </Head>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-xl px-6 py-12"
      >
        <h1 className="text-3xl font-bold text-center text-[#234851] mb-8 dark:text-[#B6EBE9]">
          Add a Pet for Adoption
        </h1>

        <Card className="shadow-lg border border-[#7097A8]">
          <CardHeader>
            <CardTitle className="text-xl text-[#234851] dark:text-[#B6EBE9]">
              Pet Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Buddy"
              />
            </div>

            <div>
              <Label htmlFor="breed">Breed / Type</Label>
              <Input
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Labrador"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
              />
            </div>

            <div>
              <Label>
                Photo <span className="text-red-500">*</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-dashed border-[#7097A8] text-[#234851] hover:bg-[#f0fdfa] dark:text-[#B6EBE9] hover:dark:text-[#234851]"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoFile ? photoFile.name : "Choose Photo"}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                className="bg-[#7097A8] hover:bg-[#5f868d] text-white"
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Add Pet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Toaster position="bottom-right" />
    </Layout>
  );
};

export default AddPet;
