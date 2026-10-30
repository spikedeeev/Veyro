"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { imageSrc } from "@/lib/format";
import type { ProductImage } from "./types";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [active, setActive] = useState(Math.max(0, sorted.findIndex((i) => i.isPrimary)));
  const current = sorted[active];

  if (!current) return <div className="aspect-[3/4] rounded-lg bg-muted" />;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="flex gap-2 md:w-20 md:flex-col">
        {sorted.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show photo ${i + 1}`}
            className={cn(
              "aspect-square w-16 overflow-hidden rounded-md border-2 bg-muted md:w-full",
              i === active ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(img.url)} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div className="aspect-[3/4] flex-1 overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc(current.url)} alt={current.alt ?? name} className="size-full object-cover" />
      </div>
    </div>
  );
}
