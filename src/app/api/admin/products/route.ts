import { NextResponse } from "next/server";

import type { AdminProductPayload } from "@/lib/product-admin-types";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminProducts } from "@/lib/supabase/queries";

export async function GET() {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const products = await getAdminProducts(auth.adminClient);
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = (await request.json()) as AdminProductPayload;
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const variants = normalizeVariants(body.variants ?? []);

  if (!name || variants.length === 0) {
    return NextResponse.json(
      { error: "Produk dan minimal satu varian wajib diisi." },
      { status: 400 }
    );
  }

  const productSlug = await createUniqueProductSlug(auth.adminClient, name);
  const { data: insertedProduct, error: productError } = await auth.adminClient
    .from("products")
    .insert({
      slug: productSlug,
      name,
      description: description || null,
      require_email: Boolean(body.requireEmail),
      is_active: true
    })
    .select("id")
    .single();

  if (productError || !insertedProduct) {
    return NextResponse.json(
      { error: "Gagal membuat produk baru." },
      { status: 500 }
    );
  }

  const variantRows = await buildVariantRows(auth.adminClient, insertedProduct.id, variants);
  const { error: variantsError } = await auth.adminClient
    .from("product_variants")
    .insert(variantRows);

  if (variantsError) {
    return NextResponse.json(
      { error: "Produk dibuat, tetapi varian gagal disimpan." },
      { status: 500 }
    );
  }

  const products = await getAdminProducts(auth.adminClient);
  return NextResponse.json({ products });
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    adminClient,
    userId: user.id
  };
}

function normalizeVariants(variants: AdminProductPayload["variants"]) {
  return variants
    .map((variant) => ({
      id: variant.id,
      label: String(variant.label ?? "").trim(),
      retailPrice: Number(variant.retailPrice) || 0,
      resellerPrice: Number(variant.resellerPrice) || 0
    }))
    .filter(
      (variant) =>
        variant.label &&
        variant.retailPrice >= 0 &&
        variant.resellerPrice >= 0
    );
}

async function buildVariantRows(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  productId: string,
  variants: ReturnType<typeof normalizeVariants>
) {
  const usedSlugs: string[] = [];

  return Promise.all(
    variants.map(async (variant, index) => {
      const slug = await createUniqueVariantSlug(
        adminClient,
        productId,
        variant.label,
        usedSlugs
      );
      usedSlugs.push(slug);

      return {
        product_id: productId,
        slug,
        label: variant.label,
        retail_price: variant.retailPrice,
        reseller_price: variant.resellerPrice,
        sort_order: index,
        is_active: true
      };
    })
  );
}

async function createUniqueProductSlug(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  value: string
) {
  const base = slugify(value) || "produk";
  let candidate = base;
  let counter = 2;

  while (true) {
    const { data } = await adminClient
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function createUniqueVariantSlug(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  productId: string,
  value: string,
  usedSlugs: string[]
) {
  const base = slugify(value) || "varian";
  let candidate = base;
  let counter = 2;

  while (true) {
    if (!usedSlugs.includes(candidate)) {
      const { data } = await adminClient
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .eq("slug", candidate)
        .maybeSingle();

      if (!data) {
        return candidate;
      }
    }

    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
