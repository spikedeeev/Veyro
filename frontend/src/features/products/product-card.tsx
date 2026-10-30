import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, imageSrc } from "@/lib/format";
import { Rating } from "./rating";
import { useAddToCart } from "./product-api";
import type { Product } from "./types";

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const router = useRouter();
  const addToCart = useAddToCart();
  const [choosingVariant, setChoosingVariant] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  const hover = images.find((i) => i.id !== primary?.id);
  const availableVariants = product.variants.filter((variant) => variant.stock > 0);
  const selectedVariant = availableVariants.find((variant) => variant.id === selectedVariantId);

  async function addSelectedVariant() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    if (!selectedVariant) return;
    try {
      await addToCart.mutateAsync({ variantId: selectedVariant.id, quantity: 1 });
      toast.success(`${product.name} added to cart`);
      setChoosingVariant(false);
      setSelectedVariantId(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add to cart");
    }
  }

  return (
    <article className="group min-w-0 space-y-3">
      <Link href={`/product/${product.id}`} className="block space-y-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(primary.url)}
              alt={primary.alt ?? product.name}
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition-opacity duration-300 group-hover:opacity-0"
            />
          ) : null}
          {hover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(hover.url)}
              alt={hover.alt ?? product.name}
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
          {!availableVariants.length ? (
            <Badge variant="secondary" className="absolute left-2 top-2">
              Out of stock
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1">
          {product.brand ? <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand.name}</p> : null}
          <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
            <Rating value={product.ratingAvg} count={product.ratingCount} />
          </div>
        </div>
      </Link>
      {availableVariants.length ? (
        choosingVariant ? (
          <div className="space-y-2 rounded-lg border p-2">
            <p className="text-xs font-medium">Choose size and color</p>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {availableVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={selectedVariantId === variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    selectedVariantId === variant.id ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
                  }`}
                >
                  {variant.size} · {variant.color}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="min-w-0 flex-1" disabled={!selectedVariant || addToCart.isPending} onClick={() => void addSelectedVariant()}>
                <ShoppingBag /> Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setChoosingVariant(false); setSelectedVariantId(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setChoosingVariant(true)}>
            <ShoppingBag /> Quick add
          </Button>
        )
      ) : null}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}
