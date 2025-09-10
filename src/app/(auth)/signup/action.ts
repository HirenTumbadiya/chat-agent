// "use server";

// import { signUpSchema, SignUpValues } from "@/lib/validation";
// import { createClient } from "@/utils/supabase/server";
// import { redirect } from "next/navigation";

// export async function signUp(
//     credentials: SignUpValues,
// ): Promise<{ error?: string }> {
//     const { username, email, password } = signUpSchema.parse(credentials);
//     const supabase = await createClient();
//     console.log(supabase);

//     // Sign up the user with Supabase Auth
//     const { data: authData, error: authError } = await supabase.auth.signUp({
//         email: credentials.email,
//         password: credentials.password,
//     });

//     console.log(authData);
//     console.log(authError);

//     if (authError) {
//         return { error: authError.message };
//     }

//     if (!authData.user) {
//         return { error: "Failed to create user account" };
//     }

//     // If email confirmation is enabled, session may be null here.
//     if (!authData.session) {
//         return { error: "Check your email to confirm your account, then sign in." };
//     }

//     // Create user profile in our database
//     const { error: profileError } = await supabase
//         .from('Profile')
//         .insert({
//             userId: authData.user.id,
//             username: credentials.username,
//         });

//     if (profileError) {
//         // If profile creation fails, we should handle this gracefully
//         // The user is still created in Supabase Auth, just missing profile
//         console.error('Profile creation failed:', profileError);
//     }

//     redirect("/");
// }

"use server";

import { signUpSchema, SignUpValues } from "@/lib/validation";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(
  credentials: SignUpValues,
): Promise<{ error?: string }> {
  const { username, email, password } = signUpSchema.parse(credentials);
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }, // store username in user_metadata
    },
  });

//   console.log("Auth:", authData, authError);

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create user account" };
  }

  if (!authData.session) {
    return {
      error: "Check your email to confirm your account, then sign in.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id, // must match PK column in `profiles`
    name: username, // assuming your column is `name`
  });

  if (profileError) {
    console.error("Profile creation failed:", profileError);
    // don't return here, because user is still created in auth
  }

  redirect("/");
}
