"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ADMIN_WHATSAPP } from "@/lib/admin-whatsapp";
import { formatRupiah } from "@/lib/currency";
import { rememberTrackedOrder } from "@/lib/order-storage";
import type { PriceTier } from "@/lib/reseller";

type PaymentClientProps = {
  buyerTier: PriceTier;
  productSlug: string;
  productName: string;
  requireEmail: boolean;
  variantSlug: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  total: number;
};

export function PaymentClient({
  buyerTier,
  productSlug,
  productName,
  requireEmail,
  variantSlug,
  variantLabel,
  unitPrice,
  qty,
  total
}: PaymentClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady =
    name.trim() !== "" &&
    whatsapp.trim() !== "" &&
    (!requireEmail || email.trim() !== "");

  async function handlePaidClick() {
    if (!isReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          buyerTier,
          productSlug,
          variantSlug,
          qty,
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          note: note.trim()
        })
      });

      const result = (await response.json()) as
        | {
            order: {
              id: string;
              orderNumber: string;
              accessToken: string;
            };
          }
        | { error: string };

      if (!response.ok || !("order" in result)) {
        throw new Error(
          "error" in result ? result.error : "Gagal membuat order."
        );
      }

      rememberTrackedOrder({
        orderNumber: result.order.orderNumber,
        accessToken: result.order.accessToken
      });

      const message = [
        "Halo admin, saya sudah bayar.",
        "",
        `No. Order: ${result.order.orderNumber}`,
        `Nama: ${name.trim()}`,
        `WhatsApp: ${whatsapp.trim()}`,
        `Email: ${email.trim() || "-"}`,
        `Produk: ${productName}`,
        `Tier: ${buyerTier === "reseller" ? "Reseller" : "Retail"}`,
        `Varian: ${variantLabel}`,
        `Harga: ${formatRupiah(unitPrice)}`,
        `Jumlah: ${qty}`,
        `Total: ${formatRupiah(total)}`,
        `Catatan: ${note.trim() || "-"}`
      ].join("\n");

      window.open(
        `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );

      router.push("/order");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal membuat order."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="catalogue">
      <div className="payment-layout">
        <section className="payment-panel">
          <div className="payment-panel__header">
            <span>QRIS Statis</span>
            <strong>Scan lalu bayar sesuai total</strong>
          </div>

          <div className="payment-panel__qris" aria-label="QRIS statis">
            <a
              href="/qris.jpeg"
              download="qris-powpow.jpeg"
              className="payment-panel__qris-download"
              aria-label="Unduh gambar QRIS"
              title="Unduh QRIS"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path
                  d="M12 4v10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m8 10 4 4 4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 18h14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <Image
              src="/qris.jpeg"
              alt="QRIS pembayaran"
              width={720}
              height={720}
              className="payment-panel__qris-image"
              priority
            />
          </div>

          <div className="payment-notes">
            <div className="payment-notes__header">Penting</div>
            <div className="payment-notes__list">
              <p>
                Pastikan produk atau akun <strong>tersedia</strong> terlebih
                dahulu dengan menghubungi admin sebelum melakukan pembayaran.
              </p>
              <p>
                Lakukan transfer dengan nominal yang <strong>sesuai total
                pesanan</strong>. Kelebihan transfer tidak dapat dikembalikan.
              </p>
              <p>
                Jika pembayaran dilakukan tanpa konfirmasi ketersediaan dan
                produk ternyata tidak tersedia, dana tidak dapat dikembalikan
                dan akan dialihkan ke <strong>produk lain dengan nilai yang
                setara</strong>.
              </p>
            </div>
          </div>
        </section>

        <section className="payment-panel payment-panel--form">
          <div className="payment-panel__header">
            <span>Detail Pembeli</span>
            <strong>Ringkasan pesanan dan konfirmasi</strong>
          </div>

          <div className="payment-summary">
            <div className="payment-summary__row">
              <span>Produk</span>
              <strong>{productName}</strong>
            </div>
            <div className="payment-summary__row">
              <span>Varian</span>
              <strong>{variantLabel}</strong>
            </div>
            <div className="payment-summary__row">
              <span>Tier</span>
              <strong>{buyerTier === "reseller" ? "Reseller" : "Retail"}</strong>
            </div>
            <div className="payment-summary__row">
              <span>Harga</span>
              <strong>{formatRupiah(unitPrice)}</strong>
            </div>
            <div className="payment-summary__row">
              <span>Jumlah</span>
              <strong>{qty}</strong>
            </div>
            <div className="payment-summary__row">
              <span>Total</span>
              <strong>{formatRupiah(total)}</strong>
            </div>
          </div>

          <form className="payment-form">
            <input type="hidden" name="productSlug" value={productSlug} />
            <input type="hidden" name="variantSlug" value={variantSlug} />

            <label className="payment-form__field">
              <span>Nama</span>
              <input
                name="name"
                type="text"
                placeholder="Nama pembeli"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="payment-form__field">
              <span>WhatsApp</span>
              <input
                name="whatsapp"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                required
              />
            </label>

            <label className="payment-form__field">
              <span>{requireEmail ? "Email (Wajib)" : "Email (Opsional)"}</span>
              <input
                name="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required={requireEmail}
              />
            </label>

            <label className="payment-form__field">
              <span>Catatan</span>
              <textarea
                name="note"
                rows={4}
                placeholder="Contoh: kirim lisensi secepatnya"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <button
              type="button"
              className={`product-card__buy-button ${!isReady || isSubmitting ? "is-disabled" : ""}`}
              aria-disabled={!isReady || isSubmitting}
              onClick={handlePaidClick}
            >
              {isSubmitting ? "Memproses..." : "Saya Sudah Bayar"}
            </button>

            {error ? <p className="reseller-login__error">{error}</p> : null}
          </form>
        </section>
      </div>
    </section>
  );
}
