"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/features/cart/api";
import { redirectToCheckout, requestCheckout, useCreateOrder } from "./api";

export function CheckoutPage() {
  const router = useRouter();
  const { data: cart, isPending } = useCart();
  const create = useCreateOrder();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!cart?.items.length && !redirecting) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Nothing to check out</h1>
        <Button asChild>
          <Link href="/catalog">Browse the catalog</Link>
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = address.trim();
    if (value.length < 5) return setError("Enter a full shipping address (at least 5 characters)");
    setError(null);

    let orderId: string;
    try {
      orderId = (await create.mutateAsync(value)).id;
    } catch (err) {
      return toast.error(err instanceof ApiError ? err.message : "Could not place the order");
    }

    setRedirecting(true);
    try {
      redirectToCheckout(await requestCheckout(orderId));
    } catch (err) {
      // The order exists; the user can retry the payment from the order page
      toast.info(err instanceof ApiError ? `${err.message}. You can pay from the order page.` : "Order created");
      router.replace(`/orders/${orderId}`);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <Label htmlFor="address">Shipping address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="City, street, building, apartment, postal code"
            aria-invalid={!!error}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <aside className="h-fit space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {cart?.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {i.variant.product.name} ({i.variant.color}, {i.variant.size}) × {i.quantity}
                </span>
                <span>{formatPrice(Number(i.variant.product.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(cart?.total ?? 0)}</span>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={create.isPending || redirecting}>
            {redirecting ? "Redirecting to payment…" : "Place order and pay"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
