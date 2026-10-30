import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "./api";

const LABELS: Record<OrderStatus, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { text: "Awaiting payment", variant: "outline" },
  PAID: { text: "Paid", variant: "default" },
  SHIPPED: { text: "Shipped", variant: "secondary" },
  DELIVERED: { text: "Delivered", variant: "secondary" },
  CANCELLED: { text: "Cancelled", variant: "destructive" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, variant } = LABELS[status];
  return <Badge variant={variant}>{text}</Badge>;
}
