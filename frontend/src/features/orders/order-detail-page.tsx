"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { redirectToCheckout, requestCheckout, useCancelOrder, useOrder } from "./api";
import { StatusBadge } from "./status-badge";

export function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isPending, error } = useOrder(id);
  const cancel = useCancelOrder(id);
  const [paying, setPaying] = useState(false);

  if (isPending) return <Skeleton className="h-64 w-full" />;

  if (error || !order) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <Button asChild variant="outline">
          <Link href="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const pay = async () => {
    setPaying(true);
    try {
      redirectToCheckout(await requestCheckout(order.id));
    } catch (e) {
      setPaying(false);
      toast.error(e instanceof ApiError ? e.message : "Could not start the payment");
    }
  };

  const onCancel = () =>
    cancel.mutate(undefined, {
      onSuccess: () => toast.success("Order cancelled"),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not cancel the order"),
    });

  return (
    <div className="space-y-6">
      <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← All orders
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order #{order.id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("en-GB")}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="divide-y rounded-lg border">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 p-4 text-sm">
            <div>
              <Link href={`/product/${i.productId}`} className="font-medium hover:underline">
                {i.productName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {i.color} · {i.size} · {formatPrice(i.unitPrice)} × {i.quantity}
              </p>
            </div>
            <span className="font-medium">{formatPrice(Number(i.unitPrice) * i.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Shipping address</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{order.shippingAddress}</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <Separator />
          {order.status === "PENDING" ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={pay} disabled={paying}>
                {paying ? "Redirecting…" : "Pay now"}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={cancel.isPending || paying}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
