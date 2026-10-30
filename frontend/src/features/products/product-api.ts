import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Paged, Product, Review } from "./types";

export type FavoriteProduct = Pick<Product, "id" | "name" | "price" | "images" | "category" | "brand">;

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => api<Product>(`/products/${id}`, { auth: false }),
    retry: false,
  });
}

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => api<Paged<Review>>(`/products/${productId}/reviews`, { auth: false, query: { limit: 50 } }),
  });
}

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api<FavoriteProduct[]>("/favorites"),
    enabled: !!user,
  });
}

export function useToggleFavorite(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isFav: boolean) =>
      api(`/favorites/${productId}`, { method: isFav ? "DELETE" : "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { variantId: string; quantity: number }) =>
      api("/cart/items", { method: "POST", body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useSubmitReview(productId: string) {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["reviews", productId] });
    qc.invalidateQueries({ queryKey: ["product", productId] });
  };
  return {
    create: useMutation({
      mutationFn: (b: { rating: number; comment?: string }) =>
        api(`/products/${productId}/reviews`, { method: "POST", body: b }),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (b: { rating: number; comment?: string }) =>
        api(`/products/${productId}/reviews/mine`, { method: "PATCH", body: b }),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: () => api(`/products/${productId}/reviews/mine`, { method: "DELETE" }),
      onSuccess: done,
    }),
  };
}
