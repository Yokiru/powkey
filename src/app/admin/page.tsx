import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminClient } from "@/components/admin-client";
import { getAdminOrders, getAdminProducts } from "@/lib/supabase/queries";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.role !== "admin") {
    redirect("/login");
  }

  const adminClient = createSupabaseAdminClient();
  const products = await getAdminProducts(adminClient);
  const orders = await getAdminOrders(adminClient);

  return (
    <Suspense fallback={null}>
      <AdminClient initialProducts={products} initialOrders={orders} />
    </Suspense>
  );
}
