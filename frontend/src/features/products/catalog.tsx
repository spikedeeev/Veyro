"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PAGE_SIZE, useProducts, type CatalogFilters } from "./api";
import { CatalogFiltersPanel } from "./catalog-filters";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { SORTS } from "./types";

const KEYS = ["search", "categoryId", "brandId", "minPrice", "maxPrice", "minRating", "sort"] as const;

function parse(sp: URLSearchParams): CatalogFilters {
  const f: CatalogFilters = {};
  for (const k of KEYS) {
    const v = sp.get(k);
    if (v) f[k] = v;
  }
  if (sp.get("inStock") === "true") f.inStock = true;
  const page = Number(sp.get("page"));
  if (Number.isInteger(page) && page > 1) f.page = page;
  return f;
}

export function Catalog() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filters = useMemo(() => parse(new URLSearchParams(sp.toString())), [sp]);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

  const { data, isLoading, isError, isFetching, refetch } = useProducts(filters);

  // The URL is the single source of truth, so filtered views are shareable and survive reloads
  function update(patch: Partial<CatalogFilters>) {
    const next = { ...filters, ...patch };
    if (!("page" in patch)) delete next.page;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
    }
    const s = qs.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  function reset() {
    setSearchDraft("");
    router.push(pathname, { scroll: false });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    update({ search: searchDraft.trim() || undefined });
  }

  const page = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const panel = <CatalogFiltersPanel key={sp.toString() === "" ? "clean" : "dirty"} filters={filters} onChange={update} onReset={reset} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Catalog</h1>
        <form onSubmit={onSearch} className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search products"
            className="pl-8"
            aria-label="Search products"
          />
        </form>
        <Select value={filters.sort ?? "newest"} onValueChange={(v) => update({ sort: v === "newest" ? undefined : v })}>
          <SelectTrigger className="w-48" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="overflow-y-auto p-4">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{panel}</aside>

        <section className="space-y-6">
          {isError ? (
            <div className="rounded-lg border p-8 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Could not load products.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <Grid>
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </Grid>
          ) : data && data.items.length === 0 ? (
            <div className="rounded-lg border p-10 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Nothing matches these filters.</p>
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            </div>
          ) : data ? (
            <>
              <p className="text-sm text-muted-foreground">
                {data.total} {data.total === 1 ? "product" : "products"}
              </p>
              <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
                <Grid>
                  {data.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </Grid>
              </div>
              {totalPages > 1 ? (
                <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                    <ChevronLeft /> Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>
                    Next <ChevronRight />
                  </Button>
                </nav>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
