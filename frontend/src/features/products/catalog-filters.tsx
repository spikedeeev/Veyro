"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrands, useCategories, type CatalogFilters } from "./api";

type Props = {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onReset: () => void;
};

function Choice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function CatalogFiltersPanel({ filters, onChange, onReset }: Props) {
  const categories = useCategories();
  const brands = useBrands();
  // Price is applied on submit, so typing does not fire a request per keystroke
  const [min, setMin] = useState(filters.minPrice ?? "");
  const [max, setMax] = useState(filters.maxPrice ?? "");

  const list = (q: typeof categories, key: "categoryId" | "brandId") =>
    q.isLoading ? (
      <Skeleton className="h-24 w-full" />
    ) : (
      <div className="space-y-0.5">
        <Choice label="All" active={!filters[key]} onClick={() => onChange({ [key]: undefined })} />
        {q.data?.map((x) => (
          <Choice key={x.id} label={x.name} active={filters[key] === x.id} onClick={() => onChange({ [key]: x.id })} />
        ))}
      </div>
    );

  return (
    <div className="space-y-5">
      <Group title="Category">{list(categories, "categoryId")}</Group>
      <Separator />
      <Group title="Brand">{list(brands, "brandId")}</Group>
      <Separator />
      <Group title="Price">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ minPrice: min || undefined, maxPrice: max || undefined });
          }}
        >
          <Input
            inputMode="numeric"
            placeholder="From"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
            aria-label="Minimum price"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            inputMode="numeric"
            placeholder="To"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))}
            aria-label="Maximum price"
          />
          <Button type="submit" size="sm" variant="secondary">
            OK
          </Button>
        </form>
      </Group>
      <Separator />
      <Group title="Rating">
        <div className="space-y-0.5">
          <Choice label="Any" active={!filters.minRating} onClick={() => onChange({ minRating: undefined })} />
          {[4, 3, 2].map((r) => (
            <Choice
              key={r}
              label={`${r}★ and up`}
              active={filters.minRating === String(r)}
              onClick={() => onChange({ minRating: String(r) })}
            />
          ))}
        </div>
      </Group>
      <Separator />
      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={!!filters.inStock}
          onCheckedChange={(v) => onChange({ inStock: v === true ? true : undefined })}
        />
        <Label htmlFor="in-stock">In stock only</Label>
      </div>
      <Button variant="outline" className="w-full" onClick={() => {
        setMin("");
        setMax("");
        onReset();
      }}>
        Reset filters
      </Button>
    </div>
  );
}
