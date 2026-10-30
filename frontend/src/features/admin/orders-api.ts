import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paged } from "@/features/products/types";
import type { Order, OrderStatus } from "@/features/orders/api";

export type AdminOrderFilters = {
  status?: OrderStatus;
  page: number;
};

const PAGE_SIZE = 20;

export function useAdminOrders(filters: AdminOrderFilters) {
  return useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () =>
      api<Paged<Order>>("/orders/admin", {
        query: { status: filters.status, page: filters.page, limit: PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api<Order>(`/orders/admin/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
}

export { PAGE_SIZE as ADMIN_ORDERS_PAGE_SIZE };
