import Link from "next/link";
import { ArrowRight, Package, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Store management</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your store from one place.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Product catalog
          </CardTitle>
          <CardDescription>
            View products, search the catalog, and publish or unpublish items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/products">
              Manage products <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <Settings2 className="mt-0.5 size-5 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="font-medium">More management tools are coming</h2>
            <p className="text-sm text-muted-foreground">
              Order, category, and user management will be added to this dashboard next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
