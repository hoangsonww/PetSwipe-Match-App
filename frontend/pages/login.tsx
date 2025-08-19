import React, { useRef, useState, useCallback, useEffect } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, PawPrint } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import Head from "next/head";

type LoginForm = {
  email: string;
  password: string;
};

const LoginPage: NextPage = () => {
  const { login } = useUser();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((prev) => !prev);

  // Cursor-tracking cat pupils
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
    const MAX = 9; // px
    setPupilOffset({ x: nx * MAX, y: ny * MAX });
  }, []);

  const resetPupils = useCallback(() => setPupilOffset({ x: 0, y: 0 }), []);

  // Track mouse across the entire page
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

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success("Logged in");
      router.push("/home");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <Layout>
      <Head>
        <title>Login | PetSwipe</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-6xl px-4 py-12"
        >
          <div className="grid gap-8 items-center md:grid-cols-2">
            {/* Mascot (above the form on mobile) */}
            <div className="order-1 md:order-1 mb-8 md:mb-0">
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-[#234851] dark:text-[#B6EBE9]">
                  Welcome back!
                </h1>
                <p className="mt-1 text-[#234851]/70 dark:text-[#B6EBE9]/80">
                  Log in to continue finding your perfect pet match. 🐱
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
                <div className="absolute -top-0.5 right-10 h-14 w-10 rotate-[15deg] rounded-t-[10px] bg-[#FFC7D1] opacity-80" />

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
                This adorable mascot is here to guide you through the login
                process. Just like finding the perfect pet, logging in should be
                a breeze!
              </p>
            </div>

            {/* Login card */}
            <div className="order-2 md:order-2">
              <Card className="w-full max-w-md rounded-2xl shadow-lg mx-auto">
                <CardHeader className="pb-0">
                  <CardTitle className="text-2xl font-bold text-center text-[#234851] dark:text-[#B6EBE9]">
                    Log In
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pt-2 pb-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-1">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...register("email", { required: "Email required" })}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...register("password", {
                            required: "Password required",
                            minLength: {
                              value: 6,
                              message: "At least 6 characters",
                            },
                          })}
                        />
                        <button
                          type="button"
                          onClick={togglePassword}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Link legacyBehavior href="/reset-password">
                        <a className="text-sm text-[#7097A8] hover:underline">
                          Forgot password?
                        </a>
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#7097A8] hover:bg-[#5f868d] text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Logging in…" : "Log In"}
                    </Button>

                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Don't have an account?{" "}
                      <Link legacyBehavior href="/signup">
                        <a className="text-[#7097A8] font-medium hover:underline">
                          Sign up
                        </a>
                      </Link>
                    </p>
                  </form>
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

export default LoginPage;
