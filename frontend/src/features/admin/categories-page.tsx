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
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from "./categories-api";

export function AdminCategoriesPage() {
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api<Named[]>("/categories", { auth: false }),
  });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2 || name.length > 100) {
      toast.error("Category name must be between 2 and 100 characters");
      return;
    }

    try {
      await createCategory.mutateAsync(name);
      setNewName("");
      toast.success("Category created");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create category");
    }
  }

  function startEditing(category: Named) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (name.length < 2 || name.length > 100) {
      toast.error("Category name must be between 2 and 100 characters");
      return;
    }

    try {
      await updateCategory.mutateAsync({ id, name });
      setEditingId(null);
      toast.success("Category updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update category");
    }
  }

  async function remove(category: Named) {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete category");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and organize product categories.</p>
      </div>

      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New category name"
          aria-label="New category name"
          maxLength={100}
          className="sm:max-w-sm"
        />
        <Button type="submit" disabled={createCategory.isPending}>
          <Plus /> Add category
        </Button>
      </form>

      {categories.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : categories.isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load categories.</p>
          <Button variant="outline" onClick={() => categories.refetch()}>Try again</Button>
        </div>
      ) : categories.data?.length ? (
        <>
        <ul className="space-y-3 lg:hidden">
          {categories.data.map((category) => (
            <li key={category.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                {editingId === category.id ? (
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label={`Rename ${category.name}`}
                    maxLength={100}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveEdit(category.id);
                      }
                      if (event.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{category.name}</span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {editingId === category.id ? (
                  <>
                    <Button variant="outline" size="icon" aria-label="Save category" disabled={updateCategory.isPending} onClick={() => void saveEdit(category.id)}><Check /></Button>
                    <Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={() => setEditingId(null)}><X /></Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" aria-label={`Edit ${category.name}`} disabled={deleteCategory.isPending} onClick={() => startEditing(category)}><Pencil /></Button>
                    <Button variant="outline" size="icon" aria-label={`Delete ${category.name}`} disabled={deleteCategory.isPending || updateCategory.isPending} onClick={() => void remove(category)}><Trash2 /></Button>
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
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.data.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {editingId === category.id ? (
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label={`Rename ${category.name}`}
                      maxLength={100}
                      autoFocus
                      className="max-w-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void saveEdit(category.id);
                        }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="flex items-center gap-2 font-medium">
                      <Tag className="size-4 text-muted-foreground" />
                      {category.name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {editingId === category.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateCategory.isPending}
                          onClick={() => void saveEdit(category.id)}
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
                          onClick={() => startEditing(category)}
                          disabled={deleteCategory.isPending}
                        >
                          <Pencil /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Delete ${category.name}`}
                          disabled={deleteCategory.isPending || updateCategory.isPending}
                          onClick={() => void remove(category)}
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
          <p className="font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground">Add a category to organize products.</p>
        </div>
      )}
    </div>
  );
}
