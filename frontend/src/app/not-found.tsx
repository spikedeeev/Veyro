import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[65vh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404 · Page not found</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">This page is out of style.</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page may have moved or the link may be incorrect. Let’s find something you’ll love.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/catalog"><Search /> Browse the catalog</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/"><ArrowLeft /> Back to Veyro</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
