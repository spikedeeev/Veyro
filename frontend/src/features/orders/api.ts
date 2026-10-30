import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Paged } from "@/features/products/types";

export type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: string;
  quantity: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  total: string;
  shippingAddress: string;
  createdAt: string;
  items: OrderItem[];
};

export type Checkout = { checkoutUrl: string };

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api<Paged<Order>>("/orders", { query: { limit: 50 } }),
    enabled: !!user,
  });
}

export function useOrder(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
    enabled: !!user,
    retry: false,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shippingAddress: string) => api<Order>("/orders", { method: "POST", body: { shippingAddress } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCancelOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export const requestCheckout = (orderId: string) => api<Checkout>(`/orders/${orderId}/pay`, { method: "POST" });

export const redirectToCheckout = ({ checkoutUrl }: Checkout) => window.location.assign(checkoutUrl);
