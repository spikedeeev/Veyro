"use client";

import Link from "next/link";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useProduct } from "./product-api";
import { ProductGallery } from "./product-gallery";
import { PurchasePanel } from "./purchase-panel";
import { Rating } from "./rating";
import { ReviewsSection } from "./reviews-section";

export function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-[3/4]" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">{missing ? "Product not found" : "Something went wrong"}</h1>
        <Link href="/catalog" className="mt-4 inline-block text-sm underline">
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <nav className="text-sm text-muted-foreground">
        <Link href="/catalog" className="hover:text-foreground">Catalog</Link>
        {product.category ? (
          <>
            {" / "}
            <Link href={`/catalog?categoryId=${product.category.id}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div className="space-y-2">
            {product.brand ? <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand.name}</p> : null}
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <Rating value={product.ratingAvg} count={product.ratingCount} />
          </div>
          <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
          <PurchasePanel product={product} />
          {product.description ? (
            <div className="space-y-2 border-t pt-6">
              <h2 className="text-sm font-medium">Description</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      <ReviewsSection productId={product.id} />
    </div>
  );
}
