"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@tradeos/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false as any,
    },
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Registration failed");
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but sign in failed. Please try logging in.");
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto p-4">
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold">
            <span className="text-[#3B82F6]">TradeOS</span>
            <span className="text-[#06B6D4] text-lg ml-1">India</span>
          </h1>
          <p className="text-[#94A3B8] text-sm mt-2">Create your account</p>
        </div>

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full mb-4 h-11 border-[#1A1A1A] bg-transparent hover:bg-[#000000]"
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#1A1A1A]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0A0A0A] px-2 text-[#475569]">
              or register with email
            </span>
          </div>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3 text-sm text-[#EF4444]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-[#EF4444] text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[#EF4444] text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[#EF4444] text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-[#EF4444] text-sm">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) =>
                setValue("acceptTerms", checked === true ? true : (false as any), {
                  shouldValidate: true,
                })
              }
            />
            <label
              htmlFor="terms"
              className="text-sm text-[#94A3B8] leading-tight cursor-pointer"
            >
              I agree to the{" "}
              <span className="text-[#3B82F6] hover:underline">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-[#3B82F6] hover:underline">
                Privacy Policy
              </span>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-[#EF4444] text-sm">
              {errors.acceptTerms.message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-[#94A3B8] mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[#3B82F6] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
