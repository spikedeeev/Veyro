"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatPrice, imageSrc } from "@/lib/format";
import { useFavorites, useToggleFavorite, type FavoriteProduct } from "@/features/products/product-api";

export function FavoritesPage() {
  const { data: favorites, isPending, isError, refetch } = useFavorites();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-lg border p-8 text-center">
        <h1 className="text-2xl font-semibold">Could not load favorites</h1>
        <p className="text-sm text-muted-foreground">Please try again.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!favorites?.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Heart className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Your favorites list is empty</h1>
        <p className="text-sm text-muted-foreground">Save products you like and find them here later.</p>
        <Button asChild>
          <Link href="/catalog">Explore the catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Favorites</h1>
        <p className="text-sm text-muted-foreground">
          {favorites.length} {favorites.length === 1 ? "item" : "items"}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {favorites.map((product) => {
          const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
          const image = images.find((item) => item.isPrimary) ?? images[0];
          return (
            <FavoriteItem key={product.id} product={product} image={image} />
          );
        })}
      </ul>
    </div>
  );
}

function FavoriteItem({
  product,
  image,
}: {
  product: FavoriteProduct;
  image: FavoriteProduct["images"][number] | undefined;
}) {
  const removeFavorite = useToggleFavorite(product.id);

  const remove = async () => {
    try {
      await removeFavorite.mutateAsync(true);
      toast.success("Removed from favorites");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove from favorites");
    }
  };

  return (
    <li className="group relative min-w-0">
      <Link href={`/product/${product.id}`} className="block space-y-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc(image.url)}
              alt={image.alt ?? product.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : null}
        </div>
        <div className="space-y-1 pr-1">
          {product.brand ? (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand.name}</p>
          ) : null}
          <h2 className="line-clamp-1 text-sm font-medium">{product.name}</h2>
          <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
        </div>
      </Link>
      <Button
        variant="secondary"
        size="icon"
        className="absolute right-2 top-2 shadow-sm"
        aria-label={`Remove ${product.name} from favorites`}
        disabled={removeFavorite.isPending}
        onClick={remove}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
