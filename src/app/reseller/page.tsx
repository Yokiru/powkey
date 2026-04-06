import { redirect } from "next/navigation";

import { logoutUser } from "@/app/reseller/actions";
import { StorefrontContent } from "@/components/storefront";
import { getProductsByTier } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResellerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, is_approved, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (!profile.is_approved) {
    return (
      <section className="reseller-shell">
        <div className="reseller-header">
          <div className="reseller-header__meta">
            <span>Status Akun</span>
            <strong>{profile.full_name || profile.email}</strong>
          </div>

          <form action={logoutUser}>
            <button type="submit" className="reseller-logout">
              Keluar
            </button>
          </form>
        </div>

        <section className="reseller-login">
          <div className="reseller-login__panel">
            <div className="reseller-login__header">
              <span>Menunggu Approval</span>
              <strong>Akun reseller kamu sudah terdaftar.</strong>
            </div>
            <p className="reseller-login__success">
              Admin belum menyetujui akun ini. Setelah disetujui, halaman ini
              akan otomatis menampilkan harga reseller.
            </p>
          </div>
        </section>
      </section>
    );
  }

  const products = await getProductsByTier(supabase, "reseller");

  return (
    <section className="reseller-shell">
      <div className="reseller-header">
        <div className="reseller-header__meta">
          <span>Reseller Session</span>
          <strong>{profile.full_name || profile.email}</strong>
        </div>

        <form action={logoutUser}>
          <button type="submit" className="reseller-logout">
            Keluar
          </button>
        </form>
      </div>

      <StorefrontContent products={products} buyerTier="reseller" />
    </section>
  );
}
