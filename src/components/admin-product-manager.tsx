"use client";

import { useState } from "react";

import type {
  AdminProductPayload,
  AdminProductRecord
} from "@/lib/product-admin-types";

type EditableVariant = {
  id?: string;
  label: string;
  retailPrice: string;
  resellerPrice: string;
};

type ProductDraft = {
  name: string;
  requireEmail: boolean;
  variants: EditableVariant[];
};

type VariantEditorProps = {
  variant: EditableVariant;
  index: number;
  total: number;
  onLabelChange: (value: string) => void;
  onRetailPriceChange: (value: string) => void;
  onResellerPriceChange: (value: string) => void;
  onRemove: () => void;
};

type AdminProductManagerProps = {
  initialProducts: AdminProductRecord[];
};

type FeedbackState = {
  type: "error" | "success";
  message: string;
} | null;

let draftVariantCounter = 0;

export function AdminProductManager({
  initialProducts
}: AdminProductManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  const [newDraft, setNewDraft] = useState<ProductDraft>(createEmptyDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function getDraft(product: AdminProductRecord) {
    return drafts[product.id] ?? createDraftFromProduct(product);
  }

  function updateExistingProduct(
    product: AdminProductRecord,
    updater: (current: ProductDraft) => ProductDraft
  ) {
    setDrafts((current) => ({
      ...current,
      [product.id]: updater(current[product.id] ?? createDraftFromProduct(product))
    }));
  }

  async function handleSaveNewProduct() {
    const payload = sanitizeDraft(newDraft);

    if (!payload) {
      setFeedback({
        type: "error",
        message: "Nama produk dan minimal satu varian dengan dua harga wajib diisi."
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as
        | { products: AdminProductRecord[] }
        | { error: string };

      if (!response.ok || !("products" in result)) {
        throw new Error(
          "error" in result ? result.error : "Gagal menyimpan produk."
        );
      }

      setProducts(result.products);
      setNewDraft(createEmptyDraft());
      setFeedback({
        type: "success",
        message: "Produk baru berhasil disimpan."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal menyimpan produk."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveExistingProduct(product: AdminProductRecord) {
    const payload = sanitizeDraft(getDraft(product));

    if (!payload) {
      setFeedback({
        type: "error",
        message: "Nama produk dan minimal satu varian dengan dua harga wajib diisi."
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as
        | { products: AdminProductRecord[] }
        | { error: string };

      if (!response.ok || !("products" in result)) {
        throw new Error(
          "error" in result ? result.error : "Gagal menyimpan perubahan."
        );
      }

      setProducts(result.products);
      setDrafts((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      setFeedback({
        type: "success",
        message: "Perubahan produk berhasil disimpan."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal menyimpan perubahan."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProduct(product: AdminProductRecord) {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE"
      });

      const result = (await response.json()) as
        | { products: AdminProductRecord[] }
        | { error: string };

      if (!response.ok || !("products" in result)) {
        throw new Error(
          "error" in result ? result.error : "Gagal menghapus produk."
        );
      }

      setProducts(result.products);
      setOpenProductId((current) => (current === product.id ? null : current));
      setDrafts((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      setFeedback({
        type: "success",
        message: "Produk berhasil dihapus."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal menghapus produk."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section__header">
        <strong>Produk</strong>
        <span>{products.length} produk</span>
      </div>

      <section className="admin-product-builder">
        <div className="admin-product-builder__header">
          <div>
            <strong>Tambah Produk</strong>
          </div>
          <button
            type="button"
            className="admin-row__save"
            onClick={handleSaveNewProduct}
            disabled={isSubmitting}
          >
            Simpan Produk
          </button>
        </div>

        <div className="admin-product-grid">
          <label className="admin-form__field">
            <span>Nama Produk</span>
            <input
              type="text"
              value={newDraft.name}
              onChange={(event) =>
                setNewDraft((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Nama produk"
            />
          </label>

          <div className="admin-product-toggle">
            <span>Email Pembeli</span>
            <button
              type="button"
              className={`admin-toggle ${newDraft.requireEmail ? "admin-toggle--active" : ""}`}
              aria-pressed={newDraft.requireEmail}
              onClick={() =>
                setNewDraft((current) => ({
                  ...current,
                  requireEmail: !current.requireEmail
                }))
              }
            >
              <span>{newDraft.requireEmail ? "Wajib" : "Opsional"}</span>
            </button>
          </div>
        </div>

        <div className="admin-variants">
          <div className="admin-product-builder__header admin-product-builder__header--variants">
            <div>
              <strong>Varian</strong>
            </div>
            <button
              type="button"
              className="admin-variant__add"
              onClick={() =>
                setNewDraft((current) => ({
                  ...current,
                  variants: [...current.variants, createEmptyVariant()]
                }))
              }
            >
              Tambah Varian
            </button>
          </div>

          <div className="admin-variant-list">
            {newDraft.variants.map((variant, index) => (
              <VariantEditor
                key={variant.id ?? `new-${index}`}
                variant={variant}
                index={index}
                total={newDraft.variants.length}
                onLabelChange={(value) =>
                  setNewDraft((current) => ({
                    ...current,
                    variants: current.variants.map((item) =>
                      item.id === variant.id
                        ? {
                            ...item,
                            label: value
                          }
                        : item
                    )
                  }))
                }
                onRetailPriceChange={(value) =>
                  setNewDraft((current) => ({
                    ...current,
                    variants: current.variants.map((item) =>
                      item.id === variant.id
                        ? {
                            ...item,
                            retailPrice: value
                          }
                        : item
                    )
                  }))
                }
                onResellerPriceChange={(value) =>
                  setNewDraft((current) => ({
                    ...current,
                    variants: current.variants.map((item) =>
                      item.id === variant.id
                        ? {
                            ...item,
                            resellerPrice: value
                          }
                        : item
                    )
                  }))
                }
                onRemove={() =>
                  setNewDraft((current) => ({
                    ...current,
                    variants:
                      current.variants.length > 1
                        ? current.variants.filter((item) => item.id !== variant.id)
                        : current.variants
                  }))
                }
              />
            ))}
          </div>
        </div>

        {feedback ? (
          <p
            className={`admin-feedback ${feedback.type === "error" ? "admin-feedback--error" : "admin-feedback--success"}`}
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <div className="admin-list" aria-label="Daftar produk">
        {products.length === 0 ? (
          <div className="admin-list__empty">
            <p>Belum ada produk di database. Tambahkan produk pertama dari form di atas.</p>
          </div>
        ) : (
          products.map((product) => {
            const isOpen = openProductId === product.id;
            const draft = getDraft(product);

            return (
              <article
                key={product.id}
                className={`admin-row ${isOpen ? "admin-row--open" : ""}`}
              >
                <button
                  type="button"
                  className="admin-row__summary"
                  onClick={() =>
                    setOpenProductId((current) =>
                      current === product.id ? null : product.id
                    )
                  }
                >
                  <div className="admin-row__main">
                    <strong>{product.name}</strong>
                    <span>{product.slug}</span>
                    <span>{product.variants.length} varian</span>
                  </div>

                  <div className="admin-row__meta">
                    <span>{product.requireEmail ? "Email wajib" : "Email opsional"}</span>
                    <strong>Edit Produk</strong>
                  </div>
                </button>

                <div
                  className={`admin-row__details ${isOpen ? "admin-row__details--open" : ""}`}
                >
                  <div className="admin-row__details-inner">
                    <div className="admin-product-grid">
                      <label className="admin-form__field">
                        <span>Nama Produk</span>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) =>
                            updateExistingProduct(product, (current) => ({
                              ...current,
                              name: event.target.value
                            }))
                          }
                          placeholder="Nama produk"
                        />
                      </label>

                      <div className="admin-product-toggle">
                        <span>Email Pembeli</span>
                        <button
                          type="button"
                          className={`admin-toggle ${draft.requireEmail ? "admin-toggle--active" : ""}`}
                          aria-pressed={draft.requireEmail}
                          onClick={() =>
                            updateExistingProduct(product, (current) => ({
                              ...current,
                              requireEmail: !current.requireEmail
                            }))
                          }
                        >
                          <span>{draft.requireEmail ? "Wajib" : "Opsional"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="admin-variants">
                      <div className="admin-product-builder__header admin-product-builder__header--variants">
                        <div>
                          <strong>Varian</strong>
                        </div>
                        <button
                          type="button"
                          className="admin-variant__add"
                          onClick={() =>
                            updateExistingProduct(product, (current) => ({
                              ...current,
                              variants: [...current.variants, createEmptyVariant()]
                            }))
                          }
                        >
                          Tambah Varian
                        </button>
                      </div>

                      <div className="admin-variant-list">
                        {draft.variants.map((variant, index) => (
                          <VariantEditor
                            key={variant.id ?? `existing-${index}`}
                            variant={variant}
                            index={index}
                            total={draft.variants.length}
                            onLabelChange={(value) =>
                              updateExistingProduct(product, (current) => ({
                                ...current,
                                variants: current.variants.map((item) =>
                                  item.id === variant.id
                                    ? {
                                        ...item,
                                        label: value
                                      }
                                    : item
                                )
                              }))
                            }
                            onRetailPriceChange={(value) =>
                              updateExistingProduct(product, (current) => ({
                                ...current,
                                variants: current.variants.map((item) =>
                                  item.id === variant.id
                                    ? {
                                        ...item,
                                        retailPrice: value
                                      }
                                    : item
                                )
                              }))
                            }
                            onResellerPriceChange={(value) =>
                              updateExistingProduct(product, (current) => ({
                                ...current,
                                variants: current.variants.map((item) =>
                                  item.id === variant.id
                                    ? {
                                        ...item,
                                        resellerPrice: value
                                      }
                                    : item
                                )
                              }))
                            }
                            onRemove={() =>
                              updateExistingProduct(product, (current) => ({
                                ...current,
                                variants:
                                  current.variants.length > 1
                                    ? current.variants.filter(
                                        (item) => item.id !== variant.id
                                      )
                                    : current.variants
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="admin-row__footer">
                      <div className="admin-row__note-group">
                        <p className="admin-row__note">
                          Atur harga pembeli biasa dan harga reseller langsung
                          dari sini.
                        </p>
                        {feedback ? (
                          <p
                            className={`admin-feedback ${feedback.type === "error" ? "admin-feedback--error" : "admin-feedback--success"}`}
                          >
                            {feedback.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="admin-row__footer-actions">
                        <button
                          type="button"
                          className="admin-row__delete"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={isSubmitting}
                        >
                          Hapus Produk
                        </button>

                        <button
                          type="button"
                          className="admin-row__save"
                          onClick={() => handleSaveExistingProduct(product)}
                          disabled={isSubmitting}
                        >
                          Simpan Perubahan
                        </button>
                      </div>
                    </div>
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

function VariantEditor({
  variant,
  index,
  total,
  onLabelChange,
  onRetailPriceChange,
  onResellerPriceChange,
  onRemove
}: VariantEditorProps) {
  return (
    <div className="admin-variant-card">
      <div className="admin-variant-card__index">Varian {index + 1}</div>

      <label className="admin-form__field">
        <span>Nama Varian</span>
        <input
          type="text"
          value={variant.label}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder="Contoh: FamPlan 1 Bulan"
        />
      </label>

      <label className="admin-form__field">
        <span>Harga Retail</span>
        <input
          type="number"
          min={0}
          value={variant.retailPrice}
          onChange={(event) => onRetailPriceChange(event.target.value)}
          placeholder="0"
        />
      </label>

      <label className="admin-form__field">
        <span>Harga Reseller</span>
        <input
          type="number"
          min={0}
          value={variant.resellerPrice}
          onChange={(event) => onResellerPriceChange(event.target.value)}
          placeholder="0"
        />
      </label>

      <div className="admin-variant-card__actions">
        <button
          type="button"
          className="admin-variant__remove"
          onClick={onRemove}
          disabled={total === 1}
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function createEmptyDraft(): ProductDraft {
  return {
    name: "",
    requireEmail: false,
    variants: [createEmptyVariant()]
  };
}

function createEmptyVariant(): EditableVariant {
  draftVariantCounter += 1;

  return {
    id: `draft-${draftVariantCounter}`,
    label: "",
    retailPrice: "",
    resellerPrice: ""
  };
}

function createDraftFromProduct(product: AdminProductRecord): ProductDraft {
  return {
    name: product.name,
    requireEmail: product.requireEmail,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      retailPrice: String(variant.retailPrice),
      resellerPrice: String(variant.resellerPrice)
    }))
  };
}

function sanitizeDraft(draft: ProductDraft): AdminProductPayload | null {
  const name = draft.name.trim();

  if (!name) {
    return null;
  }

  const variants = draft.variants
    .map((variant) => ({
      id: variant.id,
      label: variant.label.trim(),
      retailPrice: Number(variant.retailPrice),
      resellerPrice: Number(variant.resellerPrice)
    }))
    .filter(
      (variant) =>
        variant.label &&
        Number.isFinite(variant.retailPrice) &&
        Number.isFinite(variant.resellerPrice) &&
        variant.retailPrice >= 0 &&
        variant.resellerPrice >= 0
    );

  if (variants.length === 0) {
    return null;
  }

  return {
    name,
    requireEmail: draft.requireEmail,
    variants
  };
}
