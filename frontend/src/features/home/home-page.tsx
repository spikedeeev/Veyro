"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useProducts } from "@/features/products/api";
import { ProductCard, ProductCardSkeleton } from "@/features/products/product-card";
import type { Product } from "@/features/products/types";

export function HomePage() {
  const categories = useCategories();
  const newArrivals = useProducts({ sort: "newest" });
  const bestRated = useProducts({ sort: "rating_desc", minRating: "1" });

  return (
    <div className="space-y-16 pb-10 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-2xl bg-neutral-950 px-6 py-16 text-white sm:px-12 sm:py-24 lg:px-16">
        <div className="absolute -right-20 -top-32 -z-10 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-48 right-1/4 -z-10 size-96 rounded-full bg-neutral-500/20 blur-3xl" />
        <div className="max-w-2xl space-y-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/65">
            <Sparkles className="size-4" /> Everyday essentials, elevated
          </p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Find your next<br className="hidden sm:block" /> favorite fit.
          </h1>
          <p className="max-w-lg text-base leading-7 text-white/70 sm:text-lg">
            Thoughtful staples and standout pieces for wherever the day takes you.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-white text-neutral-950 hover:bg-white/90">
              <Link href="/catalog">Shop the collection <ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="#categories">Explore categories</Link>
            </Button>
          </div>
        </div>
        <div className="mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/15 pt-5 text-xs text-white/65 sm:text-sm">
          <p>Made for everyday</p>
          <p>Easy to wear</p>
          <p>Ready to go</p>
        </div>
      </section>

      <section id="categories" className="space-y-6 scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Find your style</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Shop by category</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/catalog">View all <ArrowRight /></Link>
          </Button>
        </div>

        {categories.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
          </div>
        ) : categories.isError ? (
          <RetryMessage message="Could not load categories." onRetry={() => categories.refetch()} />
        ) : categories.data?.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.data.map((category, index) => (
              <li key={category.id}>
                <Link
                  href={`/catalog?categoryId=${encodeURIComponent(category.id)}`}
                  className={`group flex min-h-28 flex-col justify-between rounded-xl border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/60 ${
                    index === 0 ? "bg-muted/50" : "bg-card"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">0{index + 1}</span>
                  <span className="flex items-center justify-between gap-2 font-medium">
                    {category.name}
                    <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            Categories are coming soon. Browse the full catalog in the meantime.
          </p>
        )}
      </section>

      <ProductSection
        eyebrow="Just landed"
        title="New arrivals"
        href="/catalog?sort=newest"
        products={newArrivals.data?.items.slice(0, 4)}
        loading={newArrivals.isPending}
        error={newArrivals.isError}
        retry={() => newArrivals.refetch()}
        emptyMessage="New products are on their way."
      />

      <ProductSection
        eyebrow="Customer favorites"
        title="Top rated"
        href="/catalog?sort=rating_desc"
        products={bestRated.data?.items.slice(0, 4)}
        loading={bestRated.isPending}
        error={bestRated.isError}
        retry={() => bestRated.refetch()}
        emptyMessage="Products with customer ratings will appear here."
      />

      <section className="grid gap-4 border-y py-8 sm:grid-cols-3 sm:py-10">
        <Benefit icon={<Truck />} title="Reliable delivery" description="Track your order from checkout to your door." />
        <Benefit icon={<RotateCcw />} title="Easy order management" description="Review your order status anytime in your account." />
        <Benefit icon={<ShieldCheck />} title="Secure checkout" description="Payments are handled securely by Stripe." />
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-muted/60 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Your next go-to is waiting.</h2>
          <p className="text-sm text-muted-foreground">Explore the collection and make it yours.</p>
        </div>
        <Button asChild>
          <Link href="/catalog">Browse all products <ArrowRight /></Link>
        </Button>
      </section>
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  href,
  products,
  loading,
  error,
  retry,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  href: string;
  products: Product[] | undefined;
  loading: boolean;
  error: boolean;
  retry: () => void;
  emptyMessage: string;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        <Button asChild variant="ghost">
          <Link href={href}>View all <ArrowRight /></Link>
        </Button>
      </div>
      {error ? (
        <RetryMessage message="Could not load products." onRetry={retry} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}
        </div>
      ) : products?.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}

function RetryMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </div>
  );
}

function Benefit({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">{icon}</span>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
