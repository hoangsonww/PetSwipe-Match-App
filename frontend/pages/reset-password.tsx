import React, { useState, useRef, useEffect, useCallback } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { Eye, EyeOff, PawPrint } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";
import Head from "next/head";

const ResetPasswordPage: NextPage = () => {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authApi.verifyEmail(email);
      toast.success("Email verified. Please set your new password.");
      setStep("reset");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Email not found");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const complexity = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!complexity.test(newPassword)) {
      toast.error(
        "Password must be at least 8 characters, include an uppercase letter and a special character.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await authApi.resetPassword(email, newPassword);
      toast.success("Password reset successfully");
      setStep("done");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Mascot eyes tracking across the whole page (like login/signup)
  const headRef = useRef<HTMLDivElement | null>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  const updatePupils = useCallback((clientX: number, clientY: number) => {
    const el = headRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)));
    const MAX = 9;
    setPupilOffset({ x: nx * MAX, y: ny * MAX });
  }, []);

  const resetPupils = useCallback(() => setPupilOffset({ x: 0, y: 0 }), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = media.matches;

    const onMove = (e: MouseEvent) => {
      if (reduced) return;
      updatePupils(e.clientX, e.clientY);
    };
    const onLeave = () => resetPupils();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [updatePupils, resetPupils]);

  return (
    <Layout>
      <Head>
        <title>Reset Password | PetSwipe</title>
      </Head>

      {/* soft, animated paw-print background */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-8 top-8 opacity-[0.06] ps-drift">
            <PawPrint className="h-16 w-16" />
          </div>
          <div className="absolute right-10 top-24 opacity-[0.06] ps-drift-slow">
            <PawPrint className="h-20 w-20" />
          </div>
          <div className="absolute left-16 bottom-10 opacity-[0.06] ps-drift-delay">
            <PawPrint className="h-12 w-12" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-6xl px-4 py-12"
        >
          <div className="grid gap-8 items-center md:grid-cols-2">
            {/* Mascot (above the form on mobile) */}
            <div className="order-1 md:order-1 mb-8 md:mb-0">
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-[#234851] dark:text-[#B6EBE9]">
                  Reset your password
                </h1>
                <p className="mt-1 text-[#234851]/70 dark:text-[#B6EBE9]/80">
                  Follow the steps to reset your password and get back to
                  swiping! 🐶
                </p>
              </div>

              <div
                ref={headRef}
                className="relative mx-auto h-64 w-64 rounded-[40%] bg-[#FFE7B3] dark:bg-[#EAC580] ps-head-shadow"
              >
                {/* Ears */}
                <div className="absolute -top-3 left-8 h-20 w-16 -rotate-[15deg] rounded-t-[14px] bg-[#FFE7B3] dark:bg-[#EAC580] ps-ear-shadow" />
                <div className="absolute -top-3 right-8 h-20 w-16 rotate-[15deg] rounded-t-[14px] bg-[#FFE7B3] dark:bg-[#EAC580] ps-ear-shadow" />
                {/* Inner ears */}
                <div className="absolute -top-0.5 left-10 h-14 w-10 -rotate-[15deg] rounded-t-[10px] bg-[#FFC7D1] opacity-80" />
                <div className="absolute -top-0.5 right-10 h-14 w-10 rotate-[15deg] bg-[#FFC7D1] rounded-t-[10px] opacity-80" />

                {/* Eyes */}
                <div className="absolute left-10 top-20 h-16 w-16 rounded-full bg-white dark:bg-white/95 ps-eye-shadow overflow-hidden">
                  <div
                    className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#234851]"
                    style={{
                      transform: `translate(calc(-50% + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`,
                      transition: "transform 60ms linear",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full bg-[#FFE7B3] dark:bg-[#EAC580] ps-blink" />
                </div>
                <div className="absolute right-10 top-20 h-16 w-16 rounded-full bg-white dark:bg-white/95 ps-eye-shadow overflow-hidden">
                  <div
                    className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#234851]"
                    style={{
                      transform: `translate(calc(-50% + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`,
                      transition: "transform 60ms linear",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full bg-[#FFE7B3] dark:bg-[#EAC580] ps-blink" />
                </div>

                {/* Nose + whiskers + mouth */}
                <div className="absolute left-1/2 top-[55%] h-3 w-4 -translate-x-1/2 rounded-b-full bg-[#EAA2A2]" />
                <div className="absolute left-1/2 top-[60%] -translate-x-1/2 h-[2px] w-40 bg-[#d1a37a]/50" />
                <div className="absolute left-[12%] top-[58%] h-[2px] w-16 bg-[#d1a37a]/50 rotate-[8deg]" />
                <div className="absolute left-[12%] top-[62%] h-[2px] w-16 bg-[#d1a37a]/50 -rotate-[8deg]" />
                <div className="absolute right-[12%] top-[58%] h-[2px] w-16 bg-[#d1a37a]/50 -rotate-[8deg]" />
                <div className="absolute right-[12%] top-[62%] h-[2px] w-16 bg-[#d1a37a]/50 rotate-[8deg]" />
                <div className="absolute left-1/2 top-[63%] -translate-x-1/2 h-6 w-10 rounded-b-full border-b-2 border-[#c48a6a]/70" />
              </div>

              <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
                Our mascot is here to help you reset your password and get back
                to swiping! Follow the steps here to set a new password and
                continue enjoying PetSwipe.
              </p>
            </div>

            {/* Reset card */}
            <div className="order-2 md:order-2">
              <Card className="w-full max-w-md rounded-2xl shadow-lg mx-auto">
                <CardHeader className="pb-0">
                  <CardTitle className="text-2xl font-bold text-center text-[#234851] dark:text-[#B6EBE9]">
                    {step === "email"
                      ? "Reset Password"
                      : step === "reset"
                        ? "Set New Password"
                        : "Success"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="px-8 pt-2 pb-8">
                  {step === "email" && (
                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                      <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-[#7097A8] hover:bg-[#5f868d] text-white"
                        disabled={loading}
                      >
                        {loading ? "Verifying…" : "Verify Email"}
                      </Button>
                      <p className="text-center text-sm text-gray-600">
                        <Link legacyBehavior href="/login">
                          <a className="text-[#7097A8] hover:underline">
                            Back to login
                          </a>
                        </Link>
                      </p>
                    </form>
                  )}

                  {step === "reset" && (
                    <form onSubmit={handleResetSubmit} className="space-y-6">
                      <div className="space-y-1">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNew ? "text" : "password"}
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((prev) => !prev)}
                            aria-label={
                              showNew ? "Hide password" : "Show password"
                            }
                            className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((prev) => !prev)}
                            aria-label={
                              showConfirm ? "Hide password" : "Show password"
                            }
                            className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            {showConfirm ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-[#7097A8] hover:bg-[#5f868d] text-white"
                        disabled={loading}
                      >
                        {loading ? "Resetting…" : "Reset Password"}
                      </Button>
                      <p className="text-center text-sm text-gray-600">
                        <Link legacyBehavior href="/login">
                          <a className="text-[#7097A8] hover:underline">
                            Back to login
                          </a>
                        </Link>
                      </p>
                    </form>
                  )}

                  {step === "done" && (
                    <div className="text-center space-y-6">
                      <p className="text-lg text-gray-700">
                        Your password has been reset successfully.
                      </p>
                      <Button
                        className="mx-auto bg-[#7097A8] hover:bg-[#5f868d] text-white"
                        onClick={() => (window.location.href = "/login")}
                      >
                        Back to Login
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS kept ASCII-clean to avoid SSR token issues */}
      <style jsx global>{`
        .ps-eye-shadow {
          box-shadow:
            inset 0 -2px 0 rgba(0, 0, 0, 0.05),
            0 6px 12px rgba(0, 0, 0, 0.08);
        }
        .ps-ear-shadow {
          box-shadow: 0 8px 10px rgba(0, 0, 0, 0.12);
        }
        .ps-head-shadow {
          box-shadow:
            inset 0 -8px 0 rgba(0, 0, 0, 0.06),
            0 10px 30px rgba(0, 0, 0, 0.15);
        }
        @keyframes psBlink {
          0%,
          92%,
          100% {
            transform: translateY(-100%);
          }
          94%,
          98% {
            transform: translateY(-10%);
          }
        }
        .ps-blink {
          transform: translateY(-100%);
          animation: psBlink 5s infinite ease-in-out;
        }
        @keyframes psDrift {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(8deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }
        .ps-drift {
          animation: psDrift 8s ease-in-out infinite;
        }
        .ps-drift-slow {
          animation: psDrift 12s ease-in-out infinite;
        }
        .ps-drift-delay {
          animation: psDrift 10s ease-in-out infinite 1.5s;
        }
      `}</style>
    </Layout>
  );
};

export default ResetPasswordPage;
