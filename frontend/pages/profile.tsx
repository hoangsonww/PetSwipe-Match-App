// frontend/pages/profile.tsx
import React, { useRef, useState, useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import useSWR from "swr";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  Camera,
  Loader2,
  Pencil,
  Trash2,
  Save,
  UserCircle2,
} from "lucide-react";
import Head from "next/head";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { userApi, AppUser } from "@/lib/api";
import { useUser } from "@/hooks/useUser";

const defaultAvatar = "/OIP.jpg";

/** fetcher */
const fetchProfile = () => userApi.getProfile().then((r) => r.user);

const Profile: NextPage = () => {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useUser();
  const {
    data: user,
    mutate,
    isValidating,
  } = useSWR<AppUser>("profile", fetchProfile);

  // protect route
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  // local form state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<AppUser>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // sync form when user loads
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        dob: user.dob,
        bio: user.bio,
      });
    }
  }, [user]);

  // save edits
  const handleSave = async () => {
    try {
      setSaving(true);
      const { user: updated } = await userApi.updateProfile({
        name: form.name,
        dob: form.dob,
        bio: form.bio,
      });
      mutate(updated, false);
      toast.success("Profile saved");
      setOpen(false);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // upload avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const { avatarUrl } = await userApi.uploadAvatar(file);
      mutate({ ...user!, avatarUrl }, false);
      toast.success("Avatar updated");
    } catch {
      toast.error("Upload failed");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // remove avatar
  const handleRemoveAvatar = async () => {
    if (!confirm("Remove your avatar?")) return;
    try {
      setSaving(true);
      const { avatarUrl } = await userApi.deleteAvatar();
      mutate({ ...user!, avatarUrl }, false);
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    } finally {
      setSaving(false);
    }
  };

  // loading
  if (authLoading || isValidating || !user) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-20 w-20 animate-spin text-[#7097A8]" />
        </div>
      </Layout>
    );
  }

  const infoRow = (label: string, value?: React.ReactNode) => (
    <div className="flex flex-col gap-1 md:flex-row md:items-center">
      <span className="w-40 shrink-0 font-medium text-[#234851]">{label}</span>
      <span className="flex-1 text-gray-700">{value || "—"}</span>
    </div>
  );

  return (
    <Layout>
      <Head>
        <title>My Profile | PetSwipe</title>
      </Head>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center text-4xl font-extrabold text-[#234851] dark:text-[#B6EBE9]"
        >
          My Profile
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="mt-10"
        >
          <Card className="border border-[#7097A8] bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#234851]">
                <UserCircle2 /> Account Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Avatar & actions */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img
                    src={user.avatarUrl || defaultAvatar}
                    alt="avatar"
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-[#7097A8]"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[#7097A8] text-white shadow hover:bg-[#5f868d]"
                  >
                    <Camera size={16} />
                  </button>
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={saving}
                    className="absolute bottom-0 left-0 grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* email + joined */}
                <div className="text-sm">
                  <p className="font-medium text-[#234851]">{user.email}</p>
                  <p className="text-gray-600">
                    Member since {format(new Date(user.createdAt), "PPP")}
                  </p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-4">
                {infoRow("Full Name", user.name)}
                {infoRow(
                  "Date of Birth",
                  user.dob ? format(new Date(user.dob), "PPP") : undefined,
                )}
                {infoRow("Bio", user.bio)}
              </div>

              {/* Edit button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpen(true)}
                  className="gap-2 bg-[#7097A8] text-white hover:bg-[#5f868d] border-none"
                >
                  <Pencil size={16} /> Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <DialogContent
            className="
              fixed top-1/2 left-1/2 w-[90vw] max-w-lg
              -translate-x-1/2 -translate-y-1/2
              rounded-2xl bg-white p-6 shadow-xl
              max-h-[90vh] overflow-auto
            "
          >
            <DialogHeader>
              <h2 className="text-xl font-semibold text-[#234851]">
                Edit Profile
              </h2>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dob || ""}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={form.bio || ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#7097A8] hover:bg-[#5f868d] text-white gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save size={16} /> Save
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Toaster position="bottom-right" />
    </Layout>
  );
};

export default Profile;
