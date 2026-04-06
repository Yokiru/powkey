import type { OrderStatusKey } from "@/lib/order-status";

export type OrderCredentialItem = {
  label?: string;
  email?: string;
  link?: string;
  password?: string;
  note?: string;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  accessToken: string;
  createdAt: string;
  buyerTier?: "retail" | "reseller";
  product: string;
  variant: string;
  unitPrice: number;
  qty: number;
  total: number;
  name: string;
  whatsapp: string;
  email: string;
  note: string;
  status: OrderStatusKey;
  credentials?: OrderCredentialItem[];
};

export type TrackedOrderRef = {
  orderNumber: string;
  accessToken: string;
};

const STORAGE_KEY = "powpow-order-refs";
const STORAGE_EVENT = "powpow-order-refs-updated";
const EMPTY_REFS: TrackedOrderRef[] = [];

let cachedRaw = "";
let cachedRefs: TrackedOrderRef[] = EMPTY_REFS;

export function getStoredTrackedOrders() {
  if (typeof window === "undefined") {
    return EMPTY_REFS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    cachedRaw = "";
    cachedRefs = EMPTY_REFS;
    return cachedRefs;
  }

  if (raw === cachedRaw) {
    return cachedRefs;
  }

  try {
    cachedRaw = raw;
    cachedRefs = normalizeTrackedOrders(JSON.parse(raw) as TrackedOrderRef[]);
    return cachedRefs;
  } catch {
    cachedRaw = "";
    cachedRefs = EMPTY_REFS;
    return cachedRefs;
  }
}

export function subscribeTrackedOrders(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent);
  };
}

export function getTrackedOrdersSnapshot() {
  return getStoredTrackedOrders();
}

export function getServerTrackedOrdersSnapshot() {
  return EMPTY_REFS;
}

export function rememberTrackedOrder(reference: TrackedOrderRef) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeTrackedOrder(reference);
  const current = getStoredTrackedOrders();
  const next = [
    normalized,
    ...current.filter((item) => item.accessToken !== normalized.accessToken)
  ];

  persistTrackedOrders(next);
}

function persistTrackedOrders(references: TrackedOrderRef[]) {
  cachedRefs = references;
  cachedRaw = JSON.stringify(references);
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeTrackedOrders(references: TrackedOrderRef[]) {
  return references
    .map(normalizeTrackedOrder)
    .filter((reference) => reference.accessToken);
}

function normalizeTrackedOrder(reference: TrackedOrderRef): TrackedOrderRef {
  return {
    orderNumber: String(reference.orderNumber ?? "").trim(),
    accessToken: String(reference.accessToken ?? "").trim()
  };
}
