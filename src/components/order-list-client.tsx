"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { formatRupiah } from "@/lib/currency";
import { ORDER_STATUSES } from "@/lib/order-status";
import {
  getServerTrackedOrdersSnapshot,
  getTrackedOrdersSnapshot,
  subscribeTrackedOrders,
  type OrderCredentialItem,
  type OrderRecord
} from "@/lib/order-storage";

export function OrderListClient() {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [claimOpenOrderId, setClaimOpenOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const trackedOrders = useSyncExternalStore(
    subscribeTrackedOrders,
    getTrackedOrdersSnapshot,
    getServerTrackedOrdersSnapshot
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadOrders() {
      if (trackedOrders.length === 0) {
        if (!isCancelled) {
          setOrders([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const tokens = trackedOrders.map((order) => order.accessToken).join(",");
        const response = await fetch(`/api/orders?tokens=${encodeURIComponent(tokens)}`);
        const result = (await response.json()) as { orders?: OrderRecord[] };

        if (!isCancelled) {
          setOrders(result.orders ?? []);
        }
      } catch {
        if (!isCancelled) {
          setOrders([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [trackedOrders]);

  return (
    <section className="order-page">
      <div className="order-page__topbar">
        <Link className="order-page__back" href="/">
          Back
        </Link>
      </div>

      <div className="order-list" aria-label="Daftar order">
        {isLoading ? (
          <div className="order-list__empty">
            <p>Memuat order...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="order-list__empty">
            <p>Belum ada order yang terhubung di browser ini.</p>
          </div>
        ) : (
          orders.map((order) => {
            const status =
              ORDER_STATUSES.find((item) => item.key === order.status) ??
              ORDER_STATUSES[0];
            const isOpen = openOrderId === order.id;
            const claimableCredentials = getClaimableCredentials(order.credentials);
            const isClaimable =
              order.status === "success" && claimableCredentials.length > 0;
            const isClaimOpen = claimOpenOrderId === order.id;

            return (
              <article
                key={order.id}
                className={`order-row ${isOpen ? "order-row--open" : ""}`}
              >
                <button
                  type="button"
                  className="order-row__summary"
                  aria-expanded={isOpen}
                  aria-controls={`order-details-${order.id}`}
                  onClick={() =>
                    setOpenOrderId((current) =>
                      current === order.id ? null : order.id
                    )
                  }
                >
                  <div className="order-row__main">
                    <strong>{order.product}</strong>
                    <span className="order-row__number">
                      {order.orderNumber || "No. order belum tersedia"}
                    </span>
                    <span className="order-row__summary-text">
                      {order.variant} | Qty {order.qty}
                    </span>
                  </div>

                  <div className="order-row__meta">
                    <span>{formatRupiah(order.total)}</span>
                    <strong>{isClaimable ? "Klaim" : status.label}</strong>
                  </div>
                </button>

                <div
                  id={`order-details-${order.id}`}
                  className={`order-row__details ${isOpen ? "order-row__details--open" : ""}`}
                  aria-hidden={!isOpen}
                >
                  <div className="order-row__details-inner">
                    {isClaimable ? (
                      <div className="order-claim">
                        <button
                          type="button"
                          className="order-claim__toggle"
                          onClick={() =>
                            setClaimOpenOrderId((current) =>
                              current === order.id ? null : order.id
                            )
                          }
                        >
                          Klaim
                        </button>

                        <div
                          className={`order-claim__panel ${isClaimOpen ? "order-claim__panel--open" : ""}`}
                          aria-hidden={!isClaimOpen}
                        >
                          <div className="order-claim__panel-inner">
                            <div className="order-credentials">
                              {claimableCredentials.map((credential, index) => (
                                <div
                                  key={`${order.id}-claim-${index}`}
                                  className="order-credential-card"
                                >
                                  <div className="order-credential-card__title">
                                    {credential.label || `Akun ${index + 1}`}
                                  </div>

                                  <div className="order-row__info">
                                    {credential.email ? (
                                      <div className="order-row__info-item">
                                        <span>Email Login</span>
                                        <strong>{credential.email}</strong>
                                      </div>
                                    ) : null}

                                    {credential.password ? (
                                      <div className="order-row__info-item">
                                        <span>Password</span>
                                        <strong>{credential.password}</strong>
                                      </div>
                                    ) : null}

                                    {credential.link ? (
                                      <div className="order-row__info-item order-row__info-item--full">
                                        <span>Link</span>
                                        <strong>
                                          <a
                                            href={normalizeCredentialLink(credential.link)}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {credential.link}
                                          </a>
                                        </strong>
                                      </div>
                                    ) : null}

                                    {credential.note ? (
                                      <div className="order-row__info-item">
                                        <span>Catatan Akun</span>
                                        <strong>{credential.note}</strong>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="order-row__info">
                      <div className="order-row__info-item">
                        <span>No. Order</span>
                        <strong>{order.orderNumber}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Produk</span>
                        <strong>{order.product}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Varian</span>
                        <strong>{order.variant}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Tanggal Order</span>
                        <strong>{formatOrderDate(order.createdAt)}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Jumlah</span>
                        <strong>{order.qty}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Total</span>
                        <strong>{formatRupiah(order.total)}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Nama</span>
                        <strong>{order.name}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>WhatsApp</span>
                        <strong>{order.whatsapp}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Email</span>
                        <strong>{order.email}</strong>
                      </div>
                      <div className="order-row__info-item">
                        <span>Catatan</span>
                        <strong>{order.note}</strong>
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

function formatOrderDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getClaimableCredentials(credentials: OrderCredentialItem[] | undefined) {
  return (credentials ?? []).filter(
    (credential) =>
      credential.email?.trim() ||
      credential.link?.trim() ||
      credential.password?.trim()
  );
}

function normalizeCredentialLink(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}
