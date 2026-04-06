import { Suspense } from "react";

import { OrderListClient } from "@/components/order-list-client";

export default function OrderPage() {
  return (
    <Suspense fallback={null}>
      <OrderListClient />
    </Suspense>
  );
}
