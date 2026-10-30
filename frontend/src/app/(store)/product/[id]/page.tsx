import { ProductPage } from "@/features/products/product-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductPage params={params} />;
}

