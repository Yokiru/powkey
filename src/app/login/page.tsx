import { redirect } from "next/navigation";

import { ResellerAuthForm } from "@/components/reseller-auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <ResellerAuthForm />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_approved, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return <ResellerAuthForm />;
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  redirect("/reseller");
}
