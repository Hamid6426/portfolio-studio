"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Loader2Icon } from "lucide-react";
import { useCreateAdminMutation } from "@/queries/auth";

export default function SetupPage() {
  const router = useRouter();
  const createAdminMutation = useCreateAdminMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function fieldError(name: string): string | undefined {
    return errors[name];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createAdminMutation.mutateAsync({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!result.success) {
      if (result.field) {
        setErrors({ [result.field]: result.message });
      } else {
        toast.error(result.message);
      }
      return;
    }

    toast.success("Your admin account is ready. Welcome aboard!");
    router.push("/login");
  }

  const pending = createAdminMutation.isPending;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Set up your admin account</CardTitle>
        <CardDescription>
          Create the first admin account to start using Portfolio Studio.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Ada Lovelace"
              autoComplete="name"
              aria-invalid={Boolean(fieldError("name"))}
              aria-describedby={fieldError("name") ? "name-error" : undefined}
            />
            {fieldError("name") && (
              <p id="name-error" className="text-sm text-destructive">
                {fieldError("name")}
              </p>
            )}
          </div>

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
              placeholder="At least 8 characters"
              autoComplete="new-password"
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldError("confirmPassword"))}
              aria-describedby={
                fieldError("confirmPassword")
                  ? "confirm-password-error"
                  : undefined
              }
            />
            {fieldError("confirmPassword") && (
              <p
                id="confirm-password-error"
                className="text-sm text-destructive"
              >
                {fieldError("confirmPassword")}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="mt-2 flex flex-col gap-4 border-t pt-6">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            {pending ? "Creating account..." : "Create admin account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Need help? Read the{" "}
            <Link
              href="/setup-guide"
              className="font-medium text-foreground underline underline-offset-3"
            >
              setup guide
            </Link>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
