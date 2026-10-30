"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { Named } from "@/features/products/types";
import { useCreateBrand, useDeleteBrand, useUpdateBrand } from "./brands-api";

export function AdminBrandsPage() {
  const brands = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => api<Named[]>("/brands", { auth: false }),
  });
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2 || name.length > 100) {
      toast.error("Brand name must be between 2 and 100 characters");
      return;
    }

    try {
      await createBrand.mutateAsync(name);
      setNewName("");
      toast.success("Brand created");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create brand");
    }
  }

  function startEditing(brand: Named) {
    setEditingId(brand.id);
    setEditingName(brand.name);
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (name.length < 2 || name.length > 100) {
      toast.error("Brand name must be between 2 and 100 characters");
      return;
    }

    try {
      await updateBrand.mutateAsync({ id, name });
      setEditingId(null);
      toast.success("Brand updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update brand");
    }
  }

  async function remove(brand: Named) {
    if (!window.confirm(`Delete the "${brand.name}" brand?`)) return;
    try {
      await deleteBrand.mutateAsync(brand.id);
      toast.success("Brand deleted");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete brand");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and organize product brands.</p>
      </div>

      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New brand name"
          aria-label="New brand name"
          maxLength={100}
          className="sm:max-w-sm"
        />
        <Button type="submit" disabled={createBrand.isPending}>
          <Plus /> Add brand
        </Button>
      </form>

      {brands.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : brands.isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load brands.</p>
          <Button variant="outline" onClick={() => brands.refetch()}>Try again</Button>
        </div>
      ) : brands.data?.length ? (
        <>
        <ul className="space-y-3 lg:hidden">
          {brands.data.map((brand) => (
            <li key={brand.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                {editingId === brand.id ? (
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label={`Rename ${brand.name}`}
                    maxLength={100}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveEdit(brand.id);
                      }
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{brand.name}</span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {editingId === brand.id ? (
                  <>
                    <Button variant="outline" size="icon" aria-label="Save brand" disabled={updateBrand.isPending} onClick={() => void saveEdit(brand.id)}><Check /></Button>
                    <Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={() => setEditingId(null)}><X /></Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" aria-label={`Edit ${brand.name}`} disabled={deleteBrand.isPending} onClick={() => startEditing(brand)}><Pencil /></Button>
                    <Button variant="outline" size="icon" aria-label={`Delete ${brand.name}`} disabled={deleteBrand.isPending || updateBrand.isPending} onClick={() => void remove(brand)}><Trash2 /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.data.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>
                  {editingId === brand.id ? (
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label={`Rename ${brand.name}`}
                      maxLength={100}
                      autoFocus
                      className="max-w-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void saveEdit(brand.id);
                        }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="flex items-center gap-2 font-medium">
                      <Tag className="size-4 text-muted-foreground" />
                      {brand.name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {editingId === brand.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateBrand.isPending}
                          onClick={() => void saveEdit(brand.id)}
                        >
                          <Check /> Save
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={() => setEditingId(null)}>
                          <X />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(brand)}
                          disabled={deleteBrand.isPending}
                        >
                          <Pencil /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete ${brand.name}`}
                          disabled={deleteBrand.isPending || updateBrand.isPending}
                          onClick={() => void remove(brand)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-10 text-center">
          <Tag className="size-8 text-muted-foreground" />
          <p className="font-medium">No brands yet</p>
          <p className="text-sm text-muted-foreground">Add a brand to associate it with products.</p>
        </div>
      )}
    </div>
  );
}
