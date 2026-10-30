import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paged, Product } from "@/features/products/types";

export type CreateProductValues = {
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string | null;
  brandId: string | null;
};

export type ProductVariantValues = { size: string; color: string; stock: number };

export type AdminProductFilters = {
  search?: string;
  page: number;
};

const PAGE_SIZE = 20;

export function useAdminProducts(filters: AdminProductFilters) {
  return useQuery({
    queryKey: ["admin-products", filters],
    queryFn: () =>
      api<Paged<Product>>("/products/admin", {
        query: { search: filters.search, page: filters.page, limit: PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api<Product>(`/products/${id}`, { method: "PATCH", body: { isActive } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });
}

export function useDeleteAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => api<Product>(`/products/admin/${id}`),
    enabled: !!id,
  });
}

export function useSaveAdminProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: CreateProductValues }) =>
      id
        ? api<Product>(`/products/${id}`, { method: "PATCH", body: values })
        : api<Product>("/products", { method: "POST", body: values }),
    onSuccess: (product) => {
      queryClient.setQueryData(["admin-product", product.id], product);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUploadProductImages(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));
      return api<Product>(`/products/${productId}/images/upload`, { method: "POST", body });
    },
    onSuccess: (product) => {
      queryClient.setQueryData(["admin-product", productId], product);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useDeleteProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api<void>(`/products/${productId}/images/${imageId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReorderProductImages(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      api<Product>(`/products/${productId}/images/order`, { method: "PUT", body: { imageIds } }),
    onSuccess: (product) => {
      queryClient.setQueryData(["admin-product", productId], product);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCreateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductVariantValues) =>
      api(`/products/${productId}/variants`, { method: "POST", body: values }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product", productId] }),
  });
}

export function useUpdateProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      api(`/products/${productId}/variants/${id}`, { method: "PATCH", body: { stock } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useDeleteProductVariant(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) =>
      api<void>(`/products/${productId}/variants/${variantId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export { PAGE_SIZE as ADMIN_PRODUCTS_PAGE_SIZE };
