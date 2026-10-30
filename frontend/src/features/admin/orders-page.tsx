"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/features/orders/status-badge";
import type { OrderStatus } from "@/features/orders/api";
import { ADMIN_ORDERS_PAGE_SIZE, useAdminOrders, useUpdateAdminOrderStatus } from "./orders-api";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Awaiting payment" },
  { value: "PAID", label: "Paid" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["CANCELLED"],
  PAID: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

function isOrderStatus(value: string): value is OrderStatus {
  return STATUSES.some((status) => status.value === value);
}

export function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const filters = { status: status === "ALL" ? undefined : status, page };
  const { data, isPending, isError, isFetching, refetch } = useAdminOrders(filters);
  const updateStatus = useUpdateAdminOrderStatus();
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_ORDERS_PAGE_SIZE)) : 1;

  async function changeStatus(orderId: string, value: string) {
    if (!isOrderStatus(value)) return;
    try {
      await updateStatus.mutateAsync({ id: orderId, status: value });
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update order status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review orders and manage fulfillment status.</p>
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL" || isOrderStatus(value)) {
              setStatus(value);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter orders by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load orders.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-10 text-center">
          <Package className="size-8 text-muted-foreground" />
          <p className="font-medium">No orders found</p>
          <p className="text-sm text-muted-foreground">Try a different status filter.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{data.total} orders</p>
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ul className="space-y-3 lg:hidden">
              {data.items.map((order) => {
                const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                return (
                  <li key={order.id} className="min-w-0 space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                        <time className="text-xs text-muted-foreground" dateTime={order.createdAt}>
                          {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="break-words text-xs text-muted-foreground">{order.shippingAddress}</p>
                    <ul className="space-y-1 border-y py-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">{item.productName} · {item.size} / {item.color}</span>
                          <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-semibold">{formatPrice(order.total)}</span>
                      {nextStatuses.length ? (
                        <OrderStatusSelect
                          orderId={order.id}
                          statuses={nextStatuses}
                          disabled={updateStatus.isPending}
                          onChange={changeStatus}
                        />
                      ) : <span className="text-xs text-muted-foreground">Final status</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((order) => {
                  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="min-w-52">
                        <p className="font-medium">#{order.id.slice(-8).toUpperCase()}</p>
                        <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground" title={order.shippingAddress}>
                          {order.shippingAddress}
                        </p>
                        <time className="text-xs text-muted-foreground" dateTime={order.createdAt}>
                          {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      </TableCell>
                      <TableCell className="min-w-44">
                        <ul className="space-y-1">
                          {order.items.map((item) => (
                            <li key={item.id} className="max-w-56 truncate text-sm" title={`${item.productName} (${item.size}, ${item.color})`}>
                              {item.productName} <span className="text-muted-foreground">× {item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="font-medium">{formatPrice(order.total)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-right">
                        {nextStatuses.length ? (
                          <OrderStatusSelect
                            orderId={order.id}
                            statuses={nextStatuses}
                            disabled={updateStatus.isPending}
                            onChange={changeStatus}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Final status</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-3" aria-label="Order pages">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

function OrderStatusSelect({
  orderId,
  statuses,
  disabled,
  onChange,
}: {
  orderId: string;
  statuses: OrderStatus[];
  disabled: boolean;
  onChange: (orderId: string, value: string) => void;
}) {
  return (
    <Select onValueChange={(value) => onChange(orderId, value)} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-40" aria-label={`Update status for order ${orderId}`}>
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUSES.find((item) => item.value === status)?.label ?? status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
