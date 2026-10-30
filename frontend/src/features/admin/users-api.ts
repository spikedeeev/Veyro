import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paged } from "@/features/products/types";

export type AdminUser = {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  orderCount: number;
};

export type AdminUserFilters = {
  search?: string;
  role?: AdminUser["role"];
  page: number;
};

export const ADMIN_USERS_PAGE_SIZE = 20;

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () =>
      api<Paged<AdminUser>>("/users/admin", {
        query: {
          search: filters.search,
          role: filters.role,
          page: filters.page,
          limit: ADMIN_USERS_PAGE_SIZE,
        },
      }),
    placeholderData: keepPreviousData,
  });
}
