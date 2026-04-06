import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderRecord } from "@/lib/order-storage";
import type { PriceTier } from "@/lib/reseller";
import type { AdminProductRecord } from "@/lib/product-admin-types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  require_email: boolean;
  is_active: boolean;
  product_variants: {
    id: string;
    slug: string;
    label: string;
    retail_price: number;
    reseller_price: number;
    sort_order: number;
    is_active: boolean;
  }[];
};

type OrderRow = {
  id: string;
  order_number: string;
  public_token: string;
  buyer_tier: "retail" | "reseller";
  unit_price: number;
  qty: number;
  total: number;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  customer_note: string | null;
  status: "waiting" | "process" | "success";
  created_at: string;
  products:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  product_variants:
    | {
        label: string;
      }
    | {
        label: string;
      }[]
    | null;
  order_credentials: {
    slot_number: number;
    label: string | null;
    email: string | null;
    link: string | null;
    password: string | null;
    note: string | null;
  }[];
};

export async function getProductsByTier(
  supabase: SupabaseClient,
  tier: PriceTier = "retail"
) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        slug,
        name,
        require_email,
        is_active,
        product_variants (
          id,
          slug,
          label,
          retail_price,
          reseller_price,
          sort_order,
          is_active
        )
      `
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as ProductRow[]).map((product) => ({
    id: product.slug,
    name: product.name,
    requireEmail: product.require_email,
    variants: (product.product_variants ?? [])
      .filter((variant) => variant.is_active)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((variant) => ({
        id: variant.slug,
        label: variant.label,
        price: tier === "reseller" ? variant.reseller_price : variant.retail_price
      }))
  }));

  return rows;
}

export async function getAdminProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        slug,
        name,
        require_email,
        is_active,
        product_variants (
          id,
          slug,
          label,
          retail_price,
          reseller_price,
          sort_order,
          is_active
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductRow[]).map<AdminProductRecord>((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    requireEmail: product.require_email,
    isActive: product.is_active,
    variants: (product.product_variants ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((variant) => ({
        id: variant.id,
        slug: variant.slug,
        label: variant.label,
        retailPrice: variant.retail_price,
        resellerPrice: variant.reseller_price,
        sortOrder: variant.sort_order,
        isActive: variant.is_active
      }))
  }));
}

export async function getProductSelectionBySlugs(
  supabase: SupabaseClient,
  input: {
    productSlug: string;
    variantSlug: string;
    tier: PriceTier;
  }
) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        slug,
        name,
        require_email,
        is_active,
        product_variants!inner (
          id,
          slug,
          label,
          retail_price,
          reseller_price,
          sort_order,
          is_active
        )
      `
    )
    .eq("slug", input.productSlug)
    .eq("is_active", true)
    .eq("product_variants.slug", input.variantSlug)
    .eq("product_variants.is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.product_variants?.[0]) {
    return null;
  }

  const variant = data.product_variants[0];

  return {
    productId: data.id,
    productSlug: data.slug,
    productName: data.name,
    requireEmail: data.require_email,
    variantId: variant.id,
    variantSlug: variant.slug,
    variantLabel: variant.label,
    unitPrice:
      input.tier === "reseller" ? variant.reseller_price : variant.retail_price
  };
}

export async function getAdminOrders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        public_token,
        buyer_tier,
        unit_price,
        qty,
        total,
        customer_name,
        customer_whatsapp,
        customer_email,
        customer_note,
        status,
        created_at,
        products (
          name
        ),
        product_variants (
          label
        ),
        order_credentials (
          slot_number,
          label,
          email,
          link,
          password,
          note
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrderRow[]).map(mapOrderRow);
}

export async function getPublicOrdersByTokens(
  supabase: SupabaseClient,
  accessTokens: string[]
) {
  if (accessTokens.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        public_token,
        buyer_tier,
        unit_price,
        qty,
        total,
        customer_name,
        customer_whatsapp,
        customer_email,
        customer_note,
        status,
        created_at,
        products (
          name
        ),
        product_variants (
          label
        ),
        order_credentials (
          slot_number,
          label,
          email,
          link,
          password,
          note
        )
      `
    )
    .in("public_token", accessTokens)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const orderMap = new Map(
    ((data ?? []) as OrderRow[]).map((row) => [row.public_token, mapOrderRow(row)])
  );

  return accessTokens
    .map((token) => orderMap.get(token))
    .filter((order): order is OrderRecord => Boolean(order));
}

function mapOrderRow(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    accessToken: row.public_token,
    createdAt: row.created_at,
    buyerTier: row.buyer_tier,
    product: pickRelatedValue(row.products, "name") ?? "Produk digital",
    variant: pickRelatedValue(row.product_variants, "label") ?? "-",
    unitPrice: row.unit_price,
    qty: row.qty,
    total: row.total,
    name: row.customer_name,
    whatsapp: row.customer_whatsapp,
    email: row.customer_email || "-",
    note: row.customer_note || "-",
    status: row.status,
    credentials: (row.order_credentials ?? [])
      .sort((left, right) => left.slot_number - right.slot_number)
      .map((credential) => ({
        label: credential.label || "",
        email: credential.email || "",
        link: credential.link || "",
        password: credential.password || "",
        note: credential.note || ""
      }))
  };
}

function pickRelatedValue<T extends Record<string, string>>(
  input: T | T[] | null,
  key: keyof T
) {
  if (Array.isArray(input)) {
    return input[0]?.[key];
  }

  return input?.[key];
}
