"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { imageSrc } from "@/lib/format";
import { useBrands, useCategories } from "@/features/products/api";
import type { Product } from "@/features/products/types";
import {
  useAdminProduct,
  useCreateProductVariant,
  useDeleteAdminProduct,
  useDeleteProductImage,
  useDeleteProductVariant,
  useReorderProductImages,
  useSaveAdminProduct,
  useUpdateProductVariant,
  useUploadProductImages,
  type CreateProductValues,
} from "./products-api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 10;

export function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const isNew = !productId;
  const productQuery = useAdminProduct(productId ?? "");
  const categoriesQuery = useCategories();
  const brandsQuery = useBrands();
  const saveProduct = useSaveAdminProduct();
  const deleteProduct = useDeleteAdminProduct();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [brandId, setBrandId] = useState("none");
  const [initialized, setInitialized] = useState(isNew);

  const product = productQuery.data;

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? "");
    setPrice(product.price);
    setCategoryId(product.category?.id ?? "none");
    setBrandId(product.brand?.id ?? "none");
    setInitialized(true);
  }, [product]);

  async function removeProduct() {
    if (!product || !window.confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted");
      router.replace("/admin/products");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete product");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPrice = Number(price);
    if (name.trim().length < 2 || name.trim().length > 255) {
      toast.error("Product name must be between 2 and 255 characters");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !/^\d+(\.\d{1,2})?$/.test(price)) {
      toast.error("Enter a valid price with up to 2 decimal places");
      return;
    }
    if (description.length > 5000) {
      toast.error("Description must be 5,000 characters or fewer");
      return;
    }

    const values: CreateProductValues = {
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      isActive: product?.isActive ?? false,
      categoryId: categoryId === "none" ? null : categoryId,
      brandId: brandId === "none" ? null : brandId,
    };

    try {
      const saved = await saveProduct.mutateAsync({ id: productId, values });
      toast.success(isNew ? "Draft product created" : "Product updated");
      if (isNew) router.replace(`/admin/products/${saved.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save product");
    }
  }

  if (!isNew && (productQuery.isPending || !initialized)) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!isNew && (productQuery.isError || !product)) {
    return (
      <div className="space-y-4 rounded-lg border p-8 text-center">
        <h1 className="text-xl font-semibold">Could not load product</h1>
        <p className="text-sm text-muted-foreground">
          {productQuery.error instanceof ApiError ? productQuery.error.message : "Please try again."}
        </p>
        <Button asChild variant="outline"><Link href="/admin/products">Back to products</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="icon" aria-label="Back to products">
          <Link href="/admin/products"><ArrowLeft /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{isNew ? "New product" : "Edit product"}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {isNew ? "Create a draft, then add images and variants." : product?.name}
          </p>
        </div>
        {!isNew ? (
          <Button variant="destructive" size="sm" disabled={deleteProduct.isPending} onClick={() => void removeProduct()}>
            <Trash2 /> Delete product
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>Name, price, description, and catalog placement.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              Product name
              <Input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={255} required />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Description
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} />
            </label>
            <label className="block max-w-xs space-y-2 text-sm font-medium">
              Price (USD)
              <Input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </label>
            {categoriesQuery.isError || brandsQuery.isError ? (
              <p className="text-sm text-destructive">Could not load categories or brands. Please refresh and try again.</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Category
                <Select value={categoryId} onValueChange={setCategoryId} disabled={categoriesQuery.isPending || categoriesQuery.isError}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categoriesQuery.data?.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Brand
                <Select value={brandId} onValueChange={setBrandId} disabled={brandsQuery.isPending || brandsQuery.isError}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand</SelectItem>
                    {brandsQuery.data?.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saveProduct.isPending || categoriesQuery.isError || brandsQuery.isError}>
                <Save /> {saveProduct.isPending ? "Saving…" : "Save product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isNew && product ? <ProductImages product={product} /> : null}
      {!isNew && product ? <ProductVariants product={product} /> : null}
    </div>
  );
}

function ProductImages({ product }: { product: Product }) {
  const uploadImages = useUploadProductImages(product.id);
  const deleteImage = useDeleteProductImage(product.id);
  const reorderImages = useReorderProductImages(product.id);
  const orderedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;
    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      toast.error(`Upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time`);
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      toast.error("Each image must be 5 MB or smaller");
      return;
    }
    try {
      await uploadImages.mutateAsync(files);
      toast.success("Images uploaded");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not upload images");
    }
  }

  async function remove(imageId: string) {
    if (!window.confirm("Remove this product image?")) return;
    try {
      await deleteImage.mutateAsync(imageId);
      toast.success("Image removed");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove image");
    }
  }

  async function move(imageIndex: number, direction: -1 | 1) {
    const targetIndex = imageIndex + direction;
    if (targetIndex < 0 || targetIndex >= orderedImages.length) return;
    const imageIds = orderedImages.map((image) => image.id);
    [imageIds[imageIndex], imageIds[targetIndex]] = [imageIds[targetIndex], imageIds[imageIndex]];
    try {
      await reorderImages.mutateAsync(imageIds);
      toast.success("Image order updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not reorder images");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product images</CardTitle>
        <CardDescription>{product.images.length} images. At least 3 are required to publish a product.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={upload}
            disabled={uploadImages.isPending}
          />
          <span className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
            <ImagePlus className="size-4" /> {uploadImages.isPending ? "Uploading…" : "Upload images"}
          </span>
        </label>
        {product.images.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {orderedImages.map((image, index) => (
              <li key={image.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc(image.url)} alt={image.alt ?? product.name} className="size-full object-cover" />
                {image.isPrimary ? <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs">Primary</span> : null}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Move image earlier"
                    disabled={index === 0 || reorderImages.isPending}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    aria-label="Move image later"
                    disabled={index === orderedImages.length - 1 || reorderImages.isPending}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="absolute right-2 top-2"
                  aria-label="Remove image"
                  disabled={deleteImage.isPending || reorderImages.isPending}
                  onClick={() => void remove(image.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProductVariants({ product }: { product: Product }) {
  const createVariant = useCreateProductVariant(product.id);
  const updateVariant = useUpdateProductVariant(product.id);
  const deleteVariant = useDeleteProductVariant(product.id);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("0");
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setStockDrafts(Object.fromEntries(product.variants.map((variant) => [variant.id, String(variant.stock)])));
  }, [product.variants]);

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedStock = Number(stock);
    if (!size.trim() || !color.trim() || !Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 1_000_000) {
      toast.error("Enter a size, color, and a valid stock quantity");
      return;
    }
    try {
      await createVariant.mutateAsync({ size: size.trim(), color: color.trim(), stock: parsedStock });
      setSize("");
      setColor("");
      setStock("0");
      toast.success("Variant added");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add variant");
    }
  }

  async function saveStock(variantId: string) {
    const parsedStock = Number(stockDrafts[variantId]);
    if (!Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 1_000_000) {
      toast.error("Stock must be a whole number from 0 to 1,000,000");
      return;
    }
    try {
      await updateVariant.mutateAsync({ id: variantId, stock: parsedStock });
      toast.success("Stock updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update stock");
    }
  }

  async function removeVariant(variantId: string) {
    if (!window.confirm("Delete this size and color variant?")) return;
    try {
      await deleteVariant.mutateAsync(variantId);
      toast.success("Variant deleted");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete variant");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sizes, colors, and stock</CardTitle>
        <CardDescription>Each size and color combination is a separate variant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {product.variants.length ? (
          <ul className="space-y-3">
            {product.variants.map((variant) => (
              <li key={variant.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <span className="min-w-24 flex-1 text-sm font-medium">{variant.size} · {variant.color}</span>
                <Input
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={stockDrafts[variant.id] ?? variant.stock}
                  onChange={(event) => setStockDrafts((drafts) => ({ ...drafts, [variant.id]: event.target.value }))}
                  aria-label={`Stock for ${variant.size} ${variant.color}`}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updateVariant.isPending}
                  onClick={() => void saveStock(variant.id)}
                >
                  Save stock
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${variant.size} ${variant.color}`}
                  disabled={deleteVariant.isPending}
                  onClick={() => void removeVariant(variant.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No variants added yet.</p>
        )}
        <form onSubmit={addVariant} className="grid gap-3 border-t pt-5 sm:grid-cols-4">
          <Input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Size" maxLength={30} aria-label="Variant size" required />
          <Input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Color" maxLength={30} aria-label="Variant color" required />
          <Input value={stock} onChange={(event) => setStock(event.target.value)} type="number" min="0" max="1000000" step="1" placeholder="Stock" aria-label="Variant stock" required />
          <Button type="submit" disabled={createVariant.isPending}><Plus /> Add variant</Button>
        </form>
      </CardContent>
    </Card>
  );
}
