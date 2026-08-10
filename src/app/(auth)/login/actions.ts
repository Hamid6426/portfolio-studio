"use server";

import { db } from "@/db/client";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

import { verifyPassword } from "@/lib/password";

export type LoginResult =
  | { success: true }
  | { success: false; field?: "email" | "password"; message: string };

export async function login(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { success: false, field: "email", message: "Please enter your email address." };
  }

  if (!password) {
    return { success: false, field: "password", message: "Please enter your password." };
  }

  try {
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
    });

    if (!user || !verifyPassword(password, user.password)) {
      return {
        success: false,
        message:
          "We couldn't find an account with that email and password. Check your details and try again.",
      };
    }
  } catch (error) {
    console.error("Login failed:", error);

    return {
      success: false,
      message:
        "Something went wrong while signing you in. Please try again in a moment.",
    };
  }

  return { success: true };
}
