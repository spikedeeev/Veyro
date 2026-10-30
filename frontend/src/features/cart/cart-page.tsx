"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatPrice, imageSrc } from "@/lib/format";
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem, type CartItem } from "./api";

function Row({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const { product } = item.variant;
  const image = product.images[0];
  const unavailable = !product.isActive || item.variant.stock < item.quantity;
  const busy = update.isPending || remove.isPending;

  const setQty = (quantity: number) =>
    update.mutate(
      { id: item.id, quantity },
      { onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update quantity") },
    );

  return (
    <li className="flex gap-4 py-4">
      <Link href={`/product/${product.id}`} className="size-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(image.url)} alt={image.alt ?? product.name} className="size-full object-cover" />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex justify-between gap-2">
          <div>
            <Link href={`/product/${product.id}`} className="text-sm font-medium hover:underline">
              {product.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {item.variant.color} · {item.variant.size}
            </p>
            {unavailable ? (
              <p className="mt-1 text-xs text-destructive">
                {!product.isActive ? "No longer available" : `Only ${item.variant.stock} in stock`}
              </p>
            ) : null}
          </div>
          <p className="text-sm font-semibold">{formatPrice(Number(product.price) * item.quantity)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-md border">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Decrease quantity" disabled={busy || item.quantity <= 1} onClick={() => setQty(item.quantity - 1)}>
              <Minus className="size-3.5" />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Increase quantity" disabled={busy || item.quantity >= item.variant.stock} onClick={() => setQty(item.quantity + 1)}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate(item.id)}>
            <Trash2 className="size-4" /> Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

export function CartPage() {
  const { data: cart, isPending } = useCart();
  const clear = useClearCart();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Button asChild>
          <Link href="/catalog">Browse the catalog</Link>
        </Button>
      </div>
    );
  }

  const blocked = cart.items.some((i) => !i.variant.product.isActive || i.variant.stock < i.quantity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cart</h1>
        <Button variant="ghost" size="sm" disabled={clear.isPending} onClick={() => clear.mutate(undefined)}>
          Clear cart
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y border-y">
          {cart.items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
        <aside className="h-fit space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items</span>
            <span>{cart.items.reduce((n, i) => n + i.quantity, 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
          {blocked ? <p className="text-xs text-destructive">Fix unavailable items to continue.</p> : null}
          <Button className="w-full" size="lg" disabled={blocked} asChild={!blocked}>
            {blocked ? <span>Checkout</span> : <Link href="/checkout">Checkout</Link>}
          </Button>
        </aside>
      </div>
    </div>
  );
}
