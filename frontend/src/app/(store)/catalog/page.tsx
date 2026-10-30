import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/features/products/catalog";

export const metadata: Metadata = { title: "Catalog" };

export default function CatalogPage() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
