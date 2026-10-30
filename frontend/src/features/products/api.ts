import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Named, Paged, Product } from "./types";

export type CatalogFilters = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
};

export const PAGE_SIZE = 12;

export function useProducts(filters: CatalogFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      api<Paged<Product>>("/products", {
        auth: false,
        query: { ...filters, inStock: filters.inStock ? true : undefined, limit: PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Named[]>("/categories", { auth: false }),
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Named[]>("/brands", { auth: false }),
    staleTime: 5 * 60_000,
  });
}
