import { redirect } from "next/navigation";

import { PaymentClient } from "@/components/payment-client";
import type { PriceTier } from "@/lib/reseller";
import { getProductSelectionBySlugs } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PaymentPageProps = {
  searchParams: Promise<{
    buyerTier?: string;
    product?: string;
    variant?: string;
    qty?: string;
  }>;
};

function parseQuantity(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const buyerTier: PriceTier =
    params.buyerTier === "reseller" ? "reseller" : "retail";
  const productSlug = String(params.product ?? "").trim();
  const variantSlug = String(params.variant ?? "").trim();
  const qty = parseQuantity(params.qty);

  if (!productSlug || !variantSlug) {
    redirect(buyerTier === "reseller" ? "/reseller" : "/");
  }

  const supabase = await createSupabaseServerClient();

  if (buyerTier === "reseller") {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved, is_active")
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
      redirect("/reseller");
    }
  }

  const selection = await getProductSelectionBySlugs(supabase, {
    productSlug,
    variantSlug,
    tier: buyerTier
  });

  if (!selection) {
    redirect(buyerTier === "reseller" ? "/reseller" : "/");
  }

  const total = selection.unitPrice * qty;

  return (
    <PaymentClient
      buyerTier={buyerTier}
      productSlug={selection.productSlug}
      productName={selection.productName}
      requireEmail={selection.requireEmail}
      variantSlug={selection.variantSlug}
      variantLabel={selection.variantLabel}
      unitPrice={selection.unitPrice}
      qty={qty}
      total={total}
    />
  );
}
