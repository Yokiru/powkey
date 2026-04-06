export const ORDER_STATUSES = [
  {
    key: "waiting",
    label: "Pending",
    description: "Pembayaran sudah dikirim dan menunggu admin mengecek."
  },
  {
    key: "process",
    label: "Proses",
    description: "Order sedang dikerjakan atau akun sedang disiapkan."
  },
  {
    key: "success",
    label: "Berhasil",
    description: "Produk sudah selesai dikirim atau akun sudah aktif."
  }
] as const;

export type OrderStatusKey = (typeof ORDER_STATUSES)[number]["key"];

export function getOrderStatusIndex(status: string | null) {
  const index = ORDER_STATUSES.findIndex((item) => item.key === status);

  if (index === -1) {
    return 0;
  }

  return index;
}
