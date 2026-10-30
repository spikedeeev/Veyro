export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type Variant = {
  id: string;
  size: string;
  color: string;
  stock: number;
};

export type Named = { id: string; name: string };

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  ratingAvg: string;
  ratingCount: number;
  images: ProductImage[];
  variants: Variant[];
  category: Named | null;
  brand: Named | null;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  author: string;
  createdAt: string;
  userId: number;
};

export type Paged<T> = { items: T[]; total: number; page: number; limit: number };

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top rated" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "oldest", label: "Oldest" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];
