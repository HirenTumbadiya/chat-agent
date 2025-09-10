"use server";

import { loginSchema, LoginValues } from "@/lib/validation";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function login(
  credentials: LoginValues,
): Promise<{ error?: string }> {
  const { email, password } = loginSchema.parse(credentials);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}