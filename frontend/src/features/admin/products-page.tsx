"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { formatPrice, imageSrc } from "@/lib/format";
import type { Product } from "@/features/products/types";
import { ADMIN_PRODUCTS_PAGE_SIZE, useAdminProducts, useUpdateAdminProduct } from "./products-api";

export function AdminProductsPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching, refetch } = useAdminProducts({ search, page });
  const updateProduct = useUpdateAdminProduct();

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  async function togglePublished(id: string, isActive: boolean) {
    try {
      await updateProduct.mutateAsync({ id, isActive: !isActive });
      toast.success(isActive ? "Product unpublished" : "Product published");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update product");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_PRODUCTS_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your catalog and product visibility.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <form onSubmit={submitSearch} className="relative sm:w-72">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search products"
              className="pl-8"
              aria-label="Search products"
            />
          </form>
          <Button asChild>
            <Link href="/admin/products/new"><Plus /> Add product</Link>
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load products.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center">
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      ) : data ? (
        <>
          <p className="text-sm text-muted-foreground">{data.total} products</p>
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ul className="space-y-3 lg:hidden">
              {data.items.map((product) => (
                <ProductCardRow
                  key={product.id}
                  product={product}
                  updating={updateProduct.isPending}
                  onTogglePublished={() => togglePublished(product.id, product.isActive)}
                />
              ))}
            </ul>
            <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36%]">Product</TableHead>
                  <TableHead className="w-[12%]">Price</TableHead>
                  <TableHead className="w-[17%]">Variants</TableHead>
                  <TableHead className="w-[13%]">Status</TableHead>
                  <TableHead className="w-[22%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((product) => {
                  const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
                    .find((item) => item.isPrimary) ?? product.images[0];
                  const stock = product.variants.reduce((total, variant) => total + variant.stock, 0);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex min-w-52 items-center gap-3">
                          <div className="size-12 shrink-0 overflow-hidden rounded bg-muted">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imageSrc(image.url)} alt={image.alt ?? product.name} className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/product/${product.id}`} className="line-clamp-1 font-medium hover:underline">
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{product.brand?.name ?? product.category?.name ?? "Uncategorized"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.variants.length} · {stock} in stock</TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button asChild variant="outline" size="sm" className="h-8 px-2">
                            <Link href={`/admin/products/${product.id}`}><Pencil /> Edit</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={updateProduct.isPending}
                            onClick={() => togglePublished(product.id, product.isActive)}
                          >
                            {product.isActive ? <><EyeOff /> Unpublish</> : <><Eye /> Publish</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-3" aria-label="Product pages">
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
      ) : null}
    </div>
  );
}

function ProductCardRow({
  product,
  updating,
  onTogglePublished,
}: {
  product: Product;
  updating: boolean;
  onTogglePublished: () => void;
}) {
  const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
    .find((item) => item.isPrimary) ?? product.images[0];
  const stock = product.variants.reduce((total, variant) => total + variant.stock, 0);

  return (
    <li className="min-w-0 rounded-lg border p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc(image.url)} alt={image.alt ?? product.name} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/product/${product.id}`} className="line-clamp-2 break-words text-sm font-medium hover:underline">
            {product.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {product.brand?.name ?? product.category?.name ?? "Uncategorized"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">{formatPrice(product.price)}</span>
            <span className="text-xs text-muted-foreground">{product.variants.length} variants · {stock} in stock</span>
          </div>
          <Badge variant={product.isActive ? "default" : "secondary"} className="mt-2">
            {product.isActive ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="min-w-0">
          <Link href={`/admin/products/${product.id}`}><Pencil /> Edit</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-w-0"
          disabled={updating}
          onClick={onTogglePublished}
        >
          {product.isActive ? <><EyeOff /> Unpublish</> : <><Eye /> Publish</>}
        </Button>
      </div>
    </li>
  );
}
