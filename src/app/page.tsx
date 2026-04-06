import { StorefrontContent } from "@/components/storefront";
import { getProductsByTier } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const products = await getProductsByTier(supabase, "retail");

  return <StorefrontContent products={products} buyerTier="retail" />;
}
