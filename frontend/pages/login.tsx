import React, { useState } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
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

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success("Logged in");
      router.push("/home");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex min-h-[80vh] items-center justify-center py-12"
      >
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl font-bold text-center text-[#234851] dark:text-[#B6EBE9]">
              Log In
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-2 pb-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 relative"
            >
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
                      minLength: { value: 6, message: "At least 6 characters" },
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
                Don’t have an account?{" "}
                <Link legacyBehavior href="/signup">
                  <a className="text-[#7097A8] font-medium hover:underline">
                    Sign up
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

export default LoginPage;
