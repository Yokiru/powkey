import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PowPow Store",
  description: "Website penjualan software dan produk digital sederhana."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
