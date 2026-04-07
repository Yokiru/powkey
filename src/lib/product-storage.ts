import { defaultProducts, type Product } from "@/data/products";

const STORAGE_KEY = "powpow-products";
const STORAGE_EVENT = "powpow-products-updated";

const DEFAULT_PRODUCTS = normalizeProducts(defaultProducts);

let cachedRaw = "";
let cachedProducts: Product[] = DEFAULT_PRODUCTS;

export function getStoredProducts() {
  if (typeof window === "undefined") {
    return DEFAULT_PRODUCTS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    cachedRaw = "";
    cachedProducts = DEFAULT_PRODUCTS;
    return cachedProducts;
  }

  if (raw === cachedRaw) {
    return cachedProducts;
  }

  try {
    cachedRaw = raw;
    cachedProducts = normalizeProducts(JSON.parse(raw) as Product[]);
    return cachedProducts;
  } catch {
    cachedRaw = "";
    cachedProducts = DEFAULT_PRODUCTS;
    return cachedProducts;
  }
}

export function getProductsSnapshot() {
  return getStoredProducts();
}

export function getServerProductsSnapshot() {
  return DEFAULT_PRODUCTS;
}

export function subscribeProducts(onStoreChange: () => void) {
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

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") {
    return;
  }

  persistProducts(normalizeProducts(products));
}

export function upsertProduct(product: Product) {
  if (typeof window === "undefined") {
    return;
  }

  const nextProduct = normalizeProduct(product);
  const current = getStoredProducts();
  const index = current.findIndex((item) => item.id === nextProduct.id);

  if (index === -1) {
    persistProducts([nextProduct, ...current]);
    return;
  }

  const next = [...current];
  next[index] = nextProduct;
  persistProducts(next);
}

export function deleteProduct(productId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getStoredProducts();
  const next = current.filter((product) => product.id !== productId);

  persistProducts(next);
}

export function createProductId(name: string) {
  const base = slugify(name) || "produk";
  const current = getStoredProducts();
  let candidate = base;
  let counter = 2;

  while (current.some((product) => product.id === candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function createVariantId(label: string, usedIds: string[]) {
  const base = slugify(label) || "varian";
  let candidate = base;
  let counter = 2;

  while (usedIds.includes(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function persistProducts(products: Product[]) {
  cachedProducts = products;
  cachedRaw = JSON.stringify(products);
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeProducts(products: Product[]) {
  return products.map(normalizeProduct);
}

function normalizeProduct(product: Product): Product {
  const usedVariantIds: string[] = [];

  return {
    id: String(product.id || "").trim(),
    name: String(product.name || "").trim(),
    description: String(product.description || "").trim(),
    requireEmail: Boolean(product.requireEmail),
    variants: (product.variants ?? []).map((variant) => {
      const id = String(variant.id || "").trim();
      const nextId = id || createVariantId(String(variant.label || ""), usedVariantIds);
      usedVariantIds.push(nextId);

      return {
        id: nextId,
        label: String(variant.label || "").trim(),
        price: Number(variant.price) || 0
      };
    })
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
