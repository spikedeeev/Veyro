import { OrderDetailPage } from "@/features/orders/order-detail-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailPage params={params} />;
}

