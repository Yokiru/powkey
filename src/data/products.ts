export type ProductVariant = {
  id: string;
  label: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  requireEmail: boolean;
  variants: ProductVariant[];
};

export const defaultProducts: Product[] = [
  {
    id: "youtube-premium-music",
    name: "YOUTUBE PREMIUM + MUSIC",
    description: "Akun premium digital untuk akses YouTube tanpa iklan dan YouTube Music.",
    requireEmail: false,
    variants: [
      {
        id: "famhead-1-bulan",
        label: "FamHead 1 Bulan",
        price: 7000
      },
      {
        id: "famplan-1-bulan",
        label: "FamPlan 1 Bulan",
        price: 3000
      },
      {
        id: "indplan-1-bulan",
        label: "IndPlan 1 Bulan",
        price: 7000
      },
      {
        id: "indplan-3-bulan",
        label: "IndPlan 3 Bulan",
        price: 18000
      }
    ]
  },
  {
    id: "spotify-premium",
    name: "SPOTIFY PREMIUM",
    description: "Paket premium Spotify digital dengan beberapa pilihan plan dan durasi.",
    requireEmail: false,
    variants: [
      {
        id: "indplan-1-bulan",
        label: "IndPlan 1 Bulan",
        price: 22000
      },
      {
        id: "famplan-1-bulan",
        label: "FamPlan 1 Bulan",
        price: 17000
      },
      {
        id: "famhead-1-bulan",
        label: "FamHead 1 Bulan",
        price: 25000
      }
    ]
  },
  {
    id: "canva-pro",
    name: "CANVA PRO",
    description: "Akses Canva Pro digital untuk kebutuhan desain harian dan pekerjaan kreatif.",
    requireEmail: false,
    variants: [
      {
        id: "1-bulan",
        label: "1 Bulan",
        price: 5000
      },
      {
        id: "3-bulan",
        label: "3 Bulan",
        price: 12000
      },
      {
        id: "12-bulan",
        label: "12 Bulan",
        price: 35000
      }
    ]
  }
];
