"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAddToCart, useFavorites, useToggleFavorite } from "./product-api";
import type { Product } from "./types";

export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useAuth();
  const addToCart = useAddToCart();
  const favorites = useFavorites();
  const toggle = useToggleFavorite(product.id);

  const colors = useMemo(() => [...new Set(product.variants.map((v) => v.color))], [product.variants]);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))],
    [product.variants],
  );
  const variantFor = (s: string, c: string | null) =>
    product.variants.find((v) => v.size === s && (c === null || v.color === c));

  const selected = size && color ? product.variants.find((v) => v.size === size && v.color === color) : undefined;
  const maxQty = selected ? Math.min(selected.stock, 10) : 1;
  const isFav = !!favorites.data?.some((p) => p.id === product.id);

  const requireLogin = () => {
    toast.info("Please sign in first");
    router.push(`/login?next=${encodeURIComponent(`/product/${product.id}`)}`);
  };

  const onAdd = async () => {
    if (!user) return requireLogin();
    if (!selected) return toast.error("Choose a size and color");
    try {
      await addToCart.mutateAsync({ variantId: selected.id, quantity: qty });
      toast.success("Added to cart");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not add to cart");
    }
  };

  const onFav = async () => {
    if (!user) return requireLogin();
    try {
      await toggle.mutateAsync(isFav);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update favorites");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Color{color ? `: ${color}` : ""}</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const available = product.variants.some((v) => v.color === c && v.stock > 0);
            return (
              <button
                key={c}
                type="button"
                disabled={!available}
                onClick={() => {
                  setColor(c);
                  setQty(1);
                  if (size && !(variantFor(size, c)?.stock)) setSize(null);
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through",
                  c === color ? "border-foreground bg-foreground text-background" : "hover:border-foreground",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Size{size ? `: ${size}` : ""}</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const available = color ? !!variantFor(s, color)?.stock : product.variants.some((v) => v.size === s && v.stock > 0);
            return (
              <button
                key={s}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSize(s);
                  setQty(1);
                }}
                className={cn(
                  "min-w-12 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through",
                  s === size ? "border-foreground bg-foreground text-background" : "hover:border-foreground",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {!color ? <p className="text-xs text-muted-foreground">Pick a color to see which sizes are available.</p> : null}
      </div>

      {selected ? (
        <p className={cn("text-sm", selected.stock <= 3 ? "text-destructive" : "text-muted-foreground")}>
          {selected.stock <= 3 ? `Only ${selected.stock} left` : "In stock"}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border">
          <Button variant="ghost" size="icon" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
          <Button variant="ghost" size="icon" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <Button size="lg" className="flex-1" onClick={onAdd} disabled={addToCart.isPending}>
          <ShoppingBag className="size-4" /> Add to cart
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-10"
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFav}
          onClick={onFav}
          disabled={toggle.isPending}
        >
          <Heart className={cn("size-4", isFav && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </div>
  );
}
