"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminProductManager } from "@/components/admin-product-manager";
import { formatRupiah } from "@/lib/currency";
import type { AdminProductRecord } from "@/lib/product-admin-types";
import { ORDER_STATUSES } from "@/lib/order-status";
import {
  type OrderCredentialItem,
  type OrderRecord
} from "@/lib/order-storage";

type OrderDraftState = {
  status: OrderRecord["status"];
  credentials: OrderCredentialItem[];
};

type AdminClientProps = {
  initialProducts: AdminProductRecord[];
  initialOrders: OrderRecord[];
};

export function AdminClient({
  initialProducts,
  initialOrders
}: AdminClientProps) {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<"orders" | "products">("orders");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<"pending" | "success">(
    "pending"
  );
  const [orderSearch, setOrderSearch] = useState("");
  const [orders, setOrders] = useState(initialOrders);
  const [drafts, setDrafts] = useState<Record<string, OrderDraftState>>({});
  const [orderActionError, setOrderActionError] = useState<string | null>(null);
  const pendingOrders = orders.filter((order) => order.status !== "success");
  const successOrders = orders.filter((order) => order.status === "success");
  const sectionOrders =
    activeSection === "pending" ? pendingOrders : successOrders;
  const searchKeyword = orderSearch.trim().toLowerCase();
  const visibleOrders = sectionOrders.filter((order) => {
    if (!searchKeyword) {
      return true;
    }

    return [
      order.orderNumber,
      order.product,
      order.variant,
      order.name,
      order.whatsapp,
      order.email,
      order.note
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchKeyword);
  });

  function getDraft(order: OrderRecord): OrderDraftState {
    return (
      drafts[order.id] ?? {
        status: order.status,
        credentials: createCredentialSlots(order, order.credentials)
      }
    );
  }

  function updateDraft(
    order: OrderRecord,
    updater: (current: OrderDraftState) => OrderDraftState
  ) {
    setDrafts((current) => {
      const base =
        current[order.id] ?? {
          status: order.status,
          credentials: createCredentialSlots(order, order.credentials)
        };

      return {
        ...current,
        [order.id]: updater(base)
      };
    });
  }

  function updateCredentialField(
    order: OrderRecord,
    index: number,
    field: keyof OrderCredentialItem,
    value: string
  ) {
    updateDraft(order, (current) => ({
      ...current,
      credentials: createCredentialSlots(order, current.credentials).map(
        (credential, credentialIndex) =>
          credentialIndex === index
            ? {
                ...credential,
                [field]: value
              }
            : credential
      )
    }));
  }

  async function handleSave(order: OrderRecord) {
    setOrderActionError(null);
    const draft = getDraft(order);
    const credentials = createCredentialSlots(order, draft.credentials).map(
      (credential, index) => ({
        label: credential.label?.trim() || `Akun ${index + 1}`,
        email: credential.email?.trim() || "",
        link: credential.link?.trim() || "",
        password: credential.password?.trim() || "",
        note: credential.note?.trim() || ""
      })
    );

    const filledCredentials = credentials.filter(
      (credential) =>
        credential.email || credential.password || credential.link
    );

    const hasAllCredentials =
      filledCredentials.length > 0 && filledCredentials.length === order.qty;

    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: hasAllCredentials ? "success" : draft.status,
        credentials: filledCredentials.length > 0 ? credentials : []
      })
    });

    const result = (await response.json()) as
      | { orders: OrderRecord[] }
      | { error: string };

    if (response.ok && "orders" in result) {
      setOrders(result.orders);
    } else if ("error" in result) {
      setOrderActionError(result.error);
    }

    setDrafts((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
  }

  async function handleDelete(order: OrderRecord) {
    if (!window.confirm(`Hapus order ${order.orderNumber}?`)) {
      return;
    }

    setOrderActionError(null);

    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "DELETE"
    });

    const result = (await response.json()) as
      | { orders: OrderRecord[] }
      | { error: string };

    if (response.ok && "orders" in result) {
      setOrders(result.orders);
      setOpenOrderId((current) => (current === order.id ? null : current));
      setDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
    } else if ("error" in result) {
      setOrderActionError(result.error);
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__topbar">
        <Link className="admin-page__back" href="/">
          Back
        </Link>
        <div className="admin-page__hint">Akses admin via URL langsung</div>
      </div>

      <div
        className={`admin-layout ${sidebarOpen ? "admin-layout--sidebar-open" : "admin-layout--sidebar-closed"}`}
      >
        <aside className="admin-sidebar" aria-label="Menu admin">
          <div className="admin-sidebar__header">
            <span className="admin-sidebar__title">
              {sidebarOpen ? "Admin" : "A"}
            </span>
            <button
              type="button"
              className="admin-sidebar__toggle"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"}
              onClick={() => setSidebarOpen((current) => !current)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                {sidebarOpen ? (
                  <>
                    <path
                      d="m16 17-5-5 5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 7v10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="m8 7 5 5-5 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 7v10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>

          <div className="admin-menu">
            <button
              type="button"
              className={`admin-menu__button ${activeMenu === "orders" ? "admin-menu__button--active" : ""}`}
              onClick={() => setActiveMenu("orders")}
              aria-label="Order"
            >
              <span>{sidebarOpen ? "Order" : "O"}</span>
            </button>
            <button
              type="button"
              className={`admin-menu__button ${activeMenu === "products" ? "admin-menu__button--active" : ""}`}
              onClick={() => setActiveMenu("products")}
              aria-label="Produk"
            >
              <span>{sidebarOpen ? "Produk" : "P"}</span>
            </button>
          </div>
        </aside>

        <div className="admin-content">
          {activeMenu === "products" ? (
            <AdminProductManager initialProducts={initialProducts} />
          ) : null}

          {activeMenu === "orders" && orders.length > 0 ? (
            <div className="admin-orders-toolbar">
              <div className="admin-switcher" aria-label="Pilih section admin">
                <button
                  type="button"
                  className={`admin-switcher__button ${activeSection === "pending" ? "admin-switcher__button--active" : ""}`}
                  onClick={() => setActiveSection("pending")}
                >
                  Perlu Diproses
                  <span>{pendingOrders.length}</span>
                </button>

                <button
                  type="button"
                  className={`admin-switcher__button ${activeSection === "success" ? "admin-switcher__button--active" : ""}`}
                  onClick={() => setActiveSection("success")}
                >
                  Berhasil
                  <span>{successOrders.length}</span>
                </button>
              </div>

              <label className="admin-orders-search" aria-label="Cari order">
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Cari order"
                />
              </label>
            </div>
          ) : null}

          {activeMenu === "orders" && orders.length === 0 ? (
            <div
              className="admin-list admin-list--single"
              aria-label="Panel admin order"
            >
              <div className="admin-list__empty">
                <p>Belum ada order di database saat ini.</p>
              </div>
            </div>
          ) : null}

          {activeMenu === "orders" && orders.length > 0 ? (
            <section className="admin-section">
              <div className="admin-section__header">
                <strong>
                  {activeSection === "pending" ? "Perlu Diproses" : "Berhasil"}
                </strong>
                <span>{visibleOrders.length} order</span>
              </div>
              {orderActionError ? (
                <p className="admin-feedback admin-feedback--error">
                  {orderActionError}
                </p>
              ) : null}
              <div className="admin-list" aria-label="Daftar order admin">
                {visibleOrders.length === 0 ? (
                  <div className="admin-list__empty">
                    <p>
                      {searchKeyword
                        ? "Tidak ada order yang cocok dengan pencarian ini."
                        : activeSection === "pending"
                          ? "Tidak ada order aktif saat ini."
                          : "Belum ada order yang selesai."}
                    </p>
                  </div>
                ) : (
                  visibleOrders.map((order) => renderOrder(order))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );

  function renderOrder(order: OrderRecord) {
    const isOpen = openOrderId === order.id;
    const draft = getDraft(order);
    const currentStatus =
      ORDER_STATUSES.find((item) => item.key === order.status) ??
      ORDER_STATUSES[0];

    return (
      <article
        key={order.id}
        className={`admin-row ${isOpen ? "admin-row--open" : ""}`}
      >
        <button
          type="button"
          className="admin-row__summary"
          onClick={() =>
            setOpenOrderId((current) => (current === order.id ? null : order.id))
          }
        >
          <div className="admin-row__main">
            <strong>{order.product}</strong>
            <span>{order.orderNumber}</span>
            <span>
              {order.variant} | Qty {order.qty}
            </span>
          </div>

          <div className="admin-row__meta">
            <span>{formatRupiah(order.total)}</span>
            <strong>{currentStatus.label}</strong>
          </div>
        </button>

        <div
          className={`admin-row__details ${isOpen ? "admin-row__details--open" : ""}`}
        >
          <div className="admin-row__details-inner">
            <div className="admin-form">
              <label className="admin-form__field">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    updateDraft(order, (current) => ({
                      ...current,
                      status: event.target.value as OrderRecord["status"]
                    }))
                  }
                >
                  <option value="waiting">Pending</option>
                  <option value="process">Proses</option>
                </select>
              </label>
            </div>

            <div className="admin-credentials">
              {createCredentialSlots(order, draft.credentials).map(
                (credential, index) => (
                  <div
                    key={`${order.id}-credential-${index}`}
                    className="admin-credential-card"
                  >
                    <div className="admin-credential-card__title">
                      {credential.label || `Akun ${index + 1}`}
                    </div>

                    <label className="admin-form__field">
                      <span>Label</span>
                      <input
                        type="text"
                        value={credential.label ?? ""}
                        onChange={(event) =>
                          updateCredentialField(
                            order,
                            index,
                            "label",
                            event.target.value
                          )
                        }
                        placeholder={`Akun ${index + 1}`}
                      />
                    </label>

                    <label className="admin-form__field">
                      <span>Email Login</span>
                      <input
                        type="text"
                        value={credential.email ?? ""}
                        onChange={(event) =>
                          updateCredentialField(
                            order,
                            index,
                            "email",
                            event.target.value
                          )
                        }
                        placeholder="email akun"
                      />
                    </label>

                    <label className="admin-form__field">
                      <span>Link (Opsional)</span>
                      <input
                        type="url"
                        value={credential.link ?? ""}
                        onChange={(event) =>
                          updateCredentialField(
                            order,
                            index,
                            "link",
                            event.target.value
                          )
                        }
                        placeholder="https://link-akun.com"
                      />
                    </label>

                    <label className="admin-form__field">
                      <span>Password</span>
                      <input
                        type="text"
                        value={credential.password ?? ""}
                        onChange={(event) =>
                          updateCredentialField(
                            order,
                            index,
                            "password",
                            event.target.value
                          )
                        }
                        placeholder="password akun"
                      />
                    </label>

                    <label className="admin-form__field admin-form__field--full">
                      <span>Catatan Credential</span>
                      <textarea
                        rows={4}
                        value={credential.note ?? ""}
                        onChange={(event) =>
                          updateCredentialField(
                            order,
                            index,
                            "note",
                            event.target.value
                          )
                        }
                        placeholder="catatan tambahan untuk user"
                      />
                    </label>
                  </div>
                )
              )}
            </div>

            <div className="admin-row__footer">
              <p className="admin-row__note">
                Jika semua credential sesuai jumlah order diisi lalu disimpan,
                status order akan otomatis menjadi
                <strong> Berhasil</strong> dan user bisa melakukan klaim di
                halaman order.
              </p>
              <div className="admin-row__footer-actions">
                <button
                  type="button"
                  className="admin-row__delete"
                  onClick={() => handleDelete(order)}
                >
                  Hapus Order
                </button>

                <button
                  type="button"
                  className="admin-row__save"
                  onClick={() => handleSave(order)}
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }
}

function createCredentialSlots(
  order: OrderRecord,
  credentials: OrderCredentialItem[] | undefined
) {
  return Array.from({ length: Math.max(order.qty, 1) }, (_, index) => ({
    label: credentials?.[index]?.label || `Akun ${index + 1}`,
    email: credentials?.[index]?.email || "",
    link: credentials?.[index]?.link || "",
    password: credentials?.[index]?.password || "",
    note: credentials?.[index]?.note || ""
  }));
}
