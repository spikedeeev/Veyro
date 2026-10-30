"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminUsers, ADMIN_USERS_PAGE_SIZE, type AdminUser } from "./users-api";

export function AdminUsersPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUser["role"] | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching, refetch } = useAdminUsers({
    search,
    role: role === "ALL" ? undefined : role,
    page,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / ADMIN_USERS_PAGE_SIZE)) : 1;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review customer accounts and order activity.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <form onSubmit={submitSearch} className="relative sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by email"
              aria-label="Search users by email"
              className="pl-8"
            />
          </form>
          <Select
            value={role}
            onValueChange={(value) => {
              if (value === "ALL" || value === "USER" || value === "ADMIN") {
                setRole(value);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter users by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="USER">Customers</SelectItem>
              <SelectItem value="ADMIN">Administrators</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load users.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border p-10 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="font-medium">No users found</p>
          <p className="text-sm text-muted-foreground">Try a different search or role filter.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{data.total} users</p>
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ul className="space-y-3 lg:hidden">
              {data.items.map((user) => (
                <li key={user.id} className="min-w-0 space-y-3 rounded-lg border p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <p className="min-w-0 break-all text-sm font-medium">{user.email}</p>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role === "ADMIN" ? "Admin" : "Customer"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>{user.orderCount} {user.orderCount === 1 ? "order" : "orders"}</span>
                    <span>
                      Joined {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role === "ADMIN" ? "Administrator" : "Customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.orderCount}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-3" aria-label="User pages">
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
      )}
    </div>
  );
}
