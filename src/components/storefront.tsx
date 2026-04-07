"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import type { Product } from "@/data/products";
import { ADMIN_WHATSAPP } from "@/lib/admin-whatsapp";
import { formatRupiah } from "@/lib/currency";

function clampQuantity(value: number) {
  if (Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function getDefaultVariant(product: Product) {
  return [...product.variants].sort((left, right) => left.price - right.price)[0];
}

type StorefrontProps = {
  products: Product[];
  buyerTier: "retail" | "reseller";
};

export function StorefrontContent({ products, buyerTier }: StorefrontProps) {
  const [search, setSearch] = useState("");
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const deferredSearch = useDeferredValue(search);

  const filteredProducts = products.filter((product) => {
    const keyword = deferredSearch.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return [product.name, ...product.variants.map((variant) => variant.label)]
      .concat(product.description ? [product.description] : [])
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  function updateQuantity(productId: string, nextValue: number) {
    setQuantities((current) => ({
      ...current,
      [productId]: clampQuantity(nextValue)
    }));
  }

  function updateVariant(productId: string, variantId: string) {
    setSelectedVariants((current) => ({
      ...current,
      [productId]: variantId
    }));
  }

  return (
    <section className="storefront">
      <div className="storefront__topbar">
        <label className="storefront__search" aria-label="Cari produk">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari"
          />
        </label>

        <Link className="storefront__order" href="/order" aria-label="Order">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M7.5 8.25V7a4.5 4.5 0 1 1 9 0v1.25" />
            <path d="M5.75 8.25h12.5l-.9 10H6.65l-.9-10Z" />
          </svg>
        </Link>
      </div>

      <div className="storefront__list" aria-label="Daftar produk digital">
        {filteredProducts.length === 0 ? (
          <div className="storefront__empty">
            <p>Tidak ada produk yang cocok dengan pencarian ini.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isOpen = openProductId === product.id;
            const quantity = quantities[product.id] ?? 1;
            const defaultVariant = getDefaultVariant(product);
            if (!defaultVariant) {
              return null;
            }
            const selectedVariantId =
              selectedVariants[product.id] ?? defaultVariant.id;
            const selectedVariant =
              product.variants.find((variant) => variant.id === selectedVariantId) ??
              defaultVariant;
            const total = selectedVariant.price * quantity;

            return (
              <article
                key={product.id}
                className={`storefront__item ${isOpen ? "storefront__item--open" : ""}`}
              >
                <button
                  className="storefront__summary"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`product-details-${product.id}`}
                  onClick={() =>
                    setOpenProductId((current) =>
                      current === product.id ? null : product.id
                    )
                  }
                >
                  <span className="storefront__summary-main">
                    <span className="storefront__name">{product.name}</span>
                  </span>
                  <span className="storefront__summary-side">
                    <span className="storefront__price">
                      {formatRupiah(selectedVariant.price)}
                    </span>
                  </span>
                </button>

                <div
                  id={`product-details-${product.id}`}
                  className={`storefront__details ${isOpen ? "storefront__details--open" : ""}`}
                  aria-hidden={!isOpen}
                >
                  <div className="storefront__details-inner">
                    {product.description ? (
                      <p className="storefront__description">{product.description}</p>
                    ) : null}

                    <div className="storefront__variants">
                      <span className="storefront__variants-label">Paket</span>
                      <div className="storefront__variant-list">
                        {product.variants.map((variant) => {
                          const isSelected = variant.id === selectedVariant.id;

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              className={`storefront__variant ${isSelected ? "storefront__variant--active" : ""}`}
                              onClick={() =>
                                updateVariant(product.id, variant.id)
                              }
                            >
                              <span>{variant.label}</span>
                              <strong>{formatRupiah(variant.price)}</strong>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="storefront__controls">
                      <label className="storefront__field">
                        <span>Jumlah</span>
                        <div className="storefront__quantity">
                          <button
                            type="button"
                            aria-label="Kurangi jumlah"
                            onClick={() =>
                              updateQuantity(product.id, quantity - 1)
                            }
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={quantity}
                            onChange={(event) =>
                              updateQuantity(
                                product.id,
                                Number(event.target.value)
                              )
                            }
                          />
                          <button
                            type="button"
                            aria-label="Tambah jumlah"
                            onClick={() =>
                              updateQuantity(product.id, quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </label>

                      <div className="storefront__total">
                        <span>Total</span>
                        <strong>{formatRupiah(total)}</strong>
                      </div>
                    </div>

                    <div className="storefront__actions">
                      <Link
                        className="storefront__buy"
                        href={{
                          pathname: "/payment",
                          query: {
                            buyerTier,
                            product: product.id,
                            variant: selectedVariant.id,
                            qty: String(quantity)
                          }
                        }}
                      >
                        Beli Sekarang
                      </Link>

                      <Link
                        className="storefront__contact"
                        href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(
                          `Halo admin, apakah ${product.name} ready?\n\nVarian: ${selectedVariant.label}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Kontak Admin
                      </Link>
                    </div>

                    <p className="storefront__note">
                      Pastikan produk atau akun ready terlebih dahulu dengan
                      kontak admin sebelum lanjut beli.
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
