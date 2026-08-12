"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useLoginMutation } from "@/queries/auth";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLoginMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function fieldError(name: string): string | undefined {
    return errors[name];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await loginMutation.mutateAsync({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      if (result.field) {
        setErrors({ [result.field]: result.message });
      } else {
        toast.error(result.message);
      }
      return;
    }

    toast.success("Welcome back!");
    router.push(safeRedirectPath(searchParams.get("next")));
  }

  const pending = loginMutation.isPending;

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={fieldError("email") ? "email-error" : undefined}
              />
              {fieldError("email") && (
                <p id="email-error" className="text-sm text-destructive">
                  {fieldError("email")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldError("password"))}
                aria-describedby={
                  fieldError("password") ? "password-error" : undefined
                }
              />
              {fieldError("password") && (
                <p id="password-error" className="text-sm text-destructive">
                  {fieldError("password")}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
