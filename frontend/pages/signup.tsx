import React, { useState } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm, FieldErrors } from "react-hook-form";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import Head from "next/head";

type SignupForm = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const SignupPage: NextPage = () => {
  const { signup } = useUser();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const togglePassword = () => setShowPassword((prev) => !prev);
  const toggleConfirm = () => setShowConfirm((prev) => !prev);

  const onError = (errs: FieldErrors<SignupForm>) => {
    const first = Object.values(errs)[0]?.message;
    if (first) toast.error(first as string);
  };

  const onSubmit = async (data: SignupForm) => {
    const { name, email, password, confirmPassword } = data;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const complexity = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!complexity.test(password)) {
      toast.error(
        "Password must be at least 8 characters, include an uppercase letter and a special character.",
      );
      return;
    }

    try {
      await signup({ name, email, password });
      toast.success("Account created");
      router.push("/home");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <Layout>
      <Head>
        <title>Register | PetSwipe</title>
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
              Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-2 pb-8">
            <form
              onSubmit={handleSubmit(onSubmit, onError)}
              className="space-y-6"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  {...register("name")}
                />
              </div>

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
                      minLength: { value: 8, message: "At least 8 characters" },
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
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                    })}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirm}
                    aria-label={
                      showConfirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute inset-y-0 right-2 flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#7097A8] hover:bg-[#5f868d] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating…" : "Create Account"}
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link legacyBehavior href="/login">
                  <a className="text-[#7097A8] font-medium hover:underline">
                    Log in
                  </a>
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
};

export default SignupPage;
