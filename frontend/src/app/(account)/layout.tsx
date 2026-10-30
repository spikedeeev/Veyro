import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { RequireAuth } from "@/components/layout/require-auth";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <RequireAuth>{children}</RequireAuth>
      </main>
    </>
  );
}
