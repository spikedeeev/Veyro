import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Link href="/" className="font-semibold tracking-tight">Veyro</Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Everyday essentials and standout styles, thoughtfully selected.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Footer navigation">
          <Link href="/catalog" className="hover:text-foreground">Catalog</Link>
          <Link href="/cart" className="hover:text-foreground">Shopping cart</Link>
          <Link href="/register" className="hover:text-foreground">Create account</Link>
        </nav>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Veyro</p>
      </div>
    </footer>
  );
}
