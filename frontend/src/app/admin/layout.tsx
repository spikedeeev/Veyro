import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { RequireAuth } from "@/components/layout/require-auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <RequireAuth role="ADMIN">
          <div className="space-y-8">
            <nav className="flex flex-wrap gap-2 border-b pb-4 text-sm" aria-label="Admin navigation">
              <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-muted">Overview</Link>
              <Link href="/admin/products" className="rounded-md px-3 py-2 hover:bg-muted">Products</Link>
              <Link href="/admin/orders" className="rounded-md px-3 py-2 hover:bg-muted">Orders</Link>
              <Link href="/admin/categories" className="rounded-md px-3 py-2 hover:bg-muted">Categories</Link>
              <Link href="/admin/brands" className="rounded-md px-3 py-2 hover:bg-muted">Brands</Link>
              <Link href="/admin/users" className="rounded-md px-3 py-2 hover:bg-muted">Users</Link>
            </nav>
            {children}
          </div>
        </RequireAuth>
      </main>
    </>
  );
}
