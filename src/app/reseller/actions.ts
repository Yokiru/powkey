"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResellerAuthState = {
  error: string | null;
  success: string | null;
};

export async function signInReseller(
  _previousState: ResellerAuthState,
  formData: FormData
): Promise<ResellerAuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      error: "Email dan password wajib diisi.",
      success: null
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return {
      error: "Login gagal. Periksa email dan password.",
      success: null
    };
  }

  redirect("/reseller");
}

export async function signUpReseller(
  _previousState: ResellerAuthState,
  formData: FormData
): Promise<ResellerAuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!fullName || !email || !password) {
    return {
      error: "Nama, email, dan password wajib diisi.",
      success: null
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    return {
      error: "Pendaftaran gagal. Email mungkin sudah digunakan.",
      success: null
    };
  }

  return {
    error: null,
    success: "Pendaftaran berhasil. Akun menunggu persetujuan admin."
  };
}

export async function logoutUser() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/reseller");
}
