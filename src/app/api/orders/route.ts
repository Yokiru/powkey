import { NextResponse } from "next/server";

import type { PriceTier } from "@/lib/reseller";
import { getProductSelectionBySlugs, getPublicOrdersByTokens } from "@/lib/supabase/queries";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";

type CreateOrderPayload = {
  buyerTier: PriceTier;
  productSlug: string;
  variantSlug: string;
  qty: number;
  name: string;
  whatsapp: string;
  email?: string;
  note?: string;
};

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokens = (searchParams.get("tokens") ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  const adminClient = createSupabaseAdminClient();
  const orders = await getPublicOrdersByTokens(adminClient, tokens);

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOrderPayload;
  const buyerTier: PriceTier =
    body.buyerTier === "reseller" ? "reseller" : "retail";
  const productSlug = String(body.productSlug ?? "").trim();
  const variantSlug = String(body.variantSlug ?? "").trim();
  const qty = normalizeQuantity(body.qty);
  const name = String(body.name ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const email = String(body.email ?? "").trim();
  const note = String(body.note ?? "").trim();

  if (!productSlug || !variantSlug || !name || !whatsapp) {
    return NextResponse.json(
      { error: "Data order belum lengkap." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  let resellerId: string | null = null;

  if (buyerTier === "reseller") {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_active || profile.role !== "reseller" || !profile.is_approved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    resellerId = user.id;
  }

  const selection = await getProductSelectionBySlugs(supabase, {
    productSlug,
    variantSlug,
    tier: buyerTier
  });

  if (!selection) {
    return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
  }

  if (selection.requireEmail && !email) {
    return NextResponse.json(
      { error: "Email wajib diisi untuk produk ini." },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const orderNumber = await createUniqueOrderNumber(adminClient);
  const { data, error } = await adminClient
    .from("orders")
    .insert({
      order_number: orderNumber,
      buyer_tier: buyerTier,
      reseller_id: resellerId,
      product_id: selection.productId,
      product_variant_id: selection.variantId,
      unit_price: selection.unitPrice,
      qty,
      total: selection.unitPrice * qty,
      customer_name: name,
      customer_whatsapp: whatsapp,
      customer_email: email || null,
      customer_note: note || null,
      status: "waiting"
    })
    .select("id, order_number, public_token")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal membuat order." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    order: {
      id: data.id,
      orderNumber: data.order_number,
      accessToken: data.public_token
    }
  });
}

function normalizeQuantity(value: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

async function createUniqueOrderNumber(
  adminClient: ReturnType<typeof createSupabaseAdminClient>
) {
  while (true) {
    const candidate = createReadableCode(5);
    const { data } = await adminClient
      .from("orders")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }
}

function createReadableCode(length: number) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => ORDER_ALPHABET[value % ORDER_ALPHABET.length]).join("");
}
