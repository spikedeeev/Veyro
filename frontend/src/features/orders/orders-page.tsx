"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { useOrders } from "./api";
import { StatusBadge } from "./status-badge";

export function OrdersPage() {
  const { data, isPending } = useOrders();

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Package className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <Button asChild>
          <Link href="/catalog">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <ul className="space-y-3">
        {data.items.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Order #{o.id.slice(-8).toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("en-GB")} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={o.status} />
                <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
