import { NextResponse } from "next/server";

import type { AdminProductPayload } from "@/lib/product-admin-types";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminProducts } from "@/lib/supabase/queries";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { productId } = await context.params;
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

  const { error: productError } = await auth.adminClient
    .from("products")
    .update({
      name,
      description: description || null,
      require_email: Boolean(body.requireEmail)
    })
    .eq("id", productId);

  if (productError) {
    return NextResponse.json(
      { error: "Gagal menyimpan produk." },
      { status: 500 }
    );
  }

  const { data: existingVariants } = await auth.adminClient
    .from("product_variants")
    .select("id, slug")
    .eq("product_id", productId);

  const existingById = new Map(
    (existingVariants ?? []).map((variant) => [variant.id, variant.slug])
  );
  const incomingIds = variants.map((variant) => variant.id).filter(Boolean);
  const deleteIds = (existingVariants ?? [])
    .filter((variant) => !incomingIds.includes(variant.id))
    .map((variant) => variant.id);

  if (deleteIds.length > 0) {
    await auth.adminClient.from("product_variants").delete().in("id", deleteIds);
  }

  const usedSlugs: string[] = [];

  for (const [index, variant] of variants.entries()) {
    const existingSlug = variant.id ? existingById.get(variant.id) : null;
    const slug =
      existingSlug ||
      (await createUniqueVariantSlug(
        auth.adminClient,
        productId,
        variant.label,
        usedSlugs
      ));
    usedSlugs.push(slug);

    if (variant.id && existingById.has(variant.id)) {
      await auth.adminClient
        .from("product_variants")
        .update({
          label: variant.label,
          retail_price: variant.retailPrice,
          reseller_price: variant.resellerPrice,
          sort_order: index,
          slug
        })
        .eq("id", variant.id);
    } else {
      await auth.adminClient.from("product_variants").insert({
        product_id: productId,
        slug,
        label: variant.label,
        retail_price: variant.retailPrice,
        reseller_price: variant.resellerPrice,
        sort_order: index,
        is_active: true
      });
    }
  }

  const products = await getAdminProducts(auth.adminClient);
  return NextResponse.json({ products });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { productId } = await context.params;
  const { error } = await auth.adminClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return NextResponse.json(
      { error: "Gagal menghapus produk." },
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
      id: typeof variant.id === "string" && !variant.id.startsWith("draft-")
        ? variant.id
        : undefined,
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
