"use server";

import { db } from "@/db/client";
import { userTable } from "@/db/schema";

import { hashPassword } from "@/lib/password";

export type CreateAdminResult =
  | { success: true }
  | { success: false; field?: "name" | "email" | "password" | "confirmPassword"; message: string };

export async function createAdmin(
  formData: FormData,
): Promise<CreateAdminResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name) {
    return { success: false, field: "name", message: "Please enter your name." };
  }

  if (!email) {
    return { success: false, field: "email", message: "Please enter your email address." };
  }

  if (!password) {
    return { success: false, field: "password", message: "Please choose a password." };
  }

  if (password.length < 8) {
    return {
      success: false,
      field: "password",
      message: "Your password needs to be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      field: "confirmPassword",
      message: "The passwords don't match. Please try again.",
    };
  }

  const existing = await db.query.userTable.findFirst({
    where: (user, { eq }) => eq(user.email, email),
    columns: { id: true },
  });

  if (existing) {
    return {
      success: false,
      field: "email",
      message: "An account with this email already exists. Try signing in instead.",
    };
  }

  try {
    await db.insert(userTable).values({
      name,
      email,
      password: hashPassword(password),
      role: "admin",
    });
  } catch (error) {
    console.error("Failed to create admin account:", error);

    return {
      success: false,
      message:
        "Something went wrong while creating your account. Please try again in a moment.",
    };
  }

  return { success: true };
}
