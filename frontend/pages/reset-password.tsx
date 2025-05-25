import React, { useState } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import { Eye, EyeOff } from "lucide-react";
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

  return (
    <Layout>
      <Head>
        <title>Reset Password | PetSwipe</title>
      </Head>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex min-h-[80vh] items-center justify-center py-12"
      >
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
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
                      aria-label={showNew ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
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
      </motion.div>
    </Layout>
  );
};

export default ResetPasswordPage;
