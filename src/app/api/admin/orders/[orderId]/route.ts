import { NextResponse } from "next/server";

import { getAdminOrders } from "@/lib/supabase/queries";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";

type OrderCredentialPayload = {
  label?: string;
  email?: string;
  link?: string;
  password?: string;
  note?: string;
};

type UpdateOrderPayload = {
  status: "waiting" | "process" | "success";
  credentials: OrderCredentialPayload[];
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { orderId } = await context.params;
  const body = (await request.json()) as UpdateOrderPayload;
  const credentials = normalizeCredentials(body.credentials ?? []);

  const { data: existingOrder } = await auth.adminClient
    .from("orders")
    .select("qty")
    .eq("id", orderId)
    .maybeSingle();

  if (!existingOrder) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  const hasAllCredentials =
    credentials.length > 0 && credentials.length === existingOrder.qty;
  const nextStatus = hasAllCredentials ? "success" : body.status;

  const { error: orderError } = await auth.adminClient
    .from("orders")
    .update({
      status: nextStatus
    })
    .eq("id", orderId);

  if (orderError) {
    return NextResponse.json(
      { error: "Gagal menyimpan status order." },
      { status: 500 }
    );
  }

  await auth.adminClient.from("order_credentials").delete().eq("order_id", orderId);

  if (credentials.length > 0) {
    const { error: credentialsError } = await auth.adminClient
      .from("order_credentials")
      .insert(
        credentials.map((credential, index) => ({
          order_id: orderId,
          slot_number: index + 1,
          label: credential.label || `Akun ${index + 1}`,
          email: credential.email || null,
          link: credential.link || null,
          password: credential.password || null,
          note: credential.note || null
        }))
      );

    if (credentialsError) {
      return NextResponse.json(
        { error: "Gagal menyimpan credential order." },
        { status: 500 }
      );
    }
  }

  const orders = await getAdminOrders(auth.adminClient);
  return NextResponse.json({ orders });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { orderId } = await context.params;
  const { error } = await auth.adminClient
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    return NextResponse.json(
      { error: "Gagal menghapus order." },
      { status: 500 }
    );
  }

  const orders = await getAdminOrders(auth.adminClient);
  return NextResponse.json({ orders });
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

  return { adminClient };
}

function normalizeCredentials(credentials: OrderCredentialPayload[]) {
  return credentials
    .map((credential) => ({
      label: String(credential.label ?? "").trim(),
      email: String(credential.email ?? "").trim(),
      link: String(credential.link ?? "").trim(),
      password: String(credential.password ?? "").trim(),
      note: String(credential.note ?? "").trim()
    }))
    .filter((credential) => credential.email || credential.link || credential.password);
}
