export type AdminProductVariantRecord = {
  id: string;
  slug: string;
  label: string;
  retailPrice: number;
  resellerPrice: number;
  sortOrder: number;
  isActive: boolean;
};

export type AdminProductRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  requireEmail: boolean;
  isActive: boolean;
  variants: AdminProductVariantRecord[];
};

export type AdminProductVariantPayload = {
  id?: string;
  label: string;
  retailPrice: number;
  resellerPrice: number;
};

export type AdminProductPayload = {
  name: string;
  description: string;
  requireEmail: boolean;
  variants: AdminProductVariantPayload[];
};
