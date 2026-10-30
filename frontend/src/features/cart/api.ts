import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type CartItem = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    size: string;
    color: string;
    stock: number;
    product: {
      id: string;
      name: string;
      price: string;
      isActive: boolean;
      images: { url: string; alt: string | null }[];
    };
  };
};

export type Cart = { items: CartItem[]; total: number };

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => api<Cart>("/cart"),
    enabled: !!user,
  });
}

// The API returns the fresh cart after every mutation, so it goes straight into the cache
function useCartMutation<V>(fn: (v: V) => Promise<Cart | void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      if (cart) qc.setQueryData(["cart"], cart);
      else qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export const useUpdateCartItem = () =>
  useCartMutation((v: { id: string; quantity: number }) =>
    api<Cart>(`/cart/items/${v.id}`, { method: "PATCH", body: { quantity: v.quantity } }),
  );

export const useRemoveCartItem = () =>
  useCartMutation((id: string) => api<Cart>(`/cart/items/${id}`, { method: "DELETE" }));

export const useClearCart = () => useCartMutation(() => api<void>("/cart", { method: "DELETE" }));
