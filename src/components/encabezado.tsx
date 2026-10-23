"use client";

import Link from "next/link";
import { useResumenCarrito } from "@/lib/carrito";

export function Encabezado() {
  const { unidades } = useResumenCarrito();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-brand text-xl">
            🛒
          </span>
          Super Pedidos
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/pedidos" className="rounded-lg px-3 py-2 hover:bg-brand-soft">
            Mis pedidos
          </Link>
          <Link
            href="/carrito"
            className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-brand-foreground hover:bg-brand-strong"
          >
            Carrito
            <span className="min-w-6 rounded-full bg-brand-foreground px-1.5 text-center text-xs leading-5 text-brand">
              {unidades}
              <span className="sr-only"> productos</span>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
