import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAccessSession } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getAccessSession();
  if (session) {
    redirect("/dashboard/overview");
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
