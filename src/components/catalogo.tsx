"use client";

import Link from "next/link";
import { useState } from "react";
import { useResumenCarrito } from "@/lib/carrito";
import { categorias, formatearPrecio, productos } from "@/lib/productos";
import { TarjetaProducto } from "./tarjeta-producto";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function Catalogo() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const { carrito, unidades, subtotal } = useResumenCarrito();

  const termino = normalizar(busqueda);
  const visibles = productos.filter(
    (producto) =>
      (categoria === null || producto.categoria === categoria) &&
      (termino === "" || normalizar(producto.nombre).includes(termino)),
  );

  const chip = (activo: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
      activo
        ? "border-brand bg-brand text-brand-foreground"
        : "border-border bg-surface hover:border-brand"
    }`;

  return (
    <div className={unidades > 0 ? "pb-24" : undefined}>
      <label className="block">
        <span className="sr-only">Buscar productos</span>
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar productos: arroz, leche, pollo…"
          className="h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          className={chip(categoria === null)}
          aria-pressed={categoria === null}
          onClick={() => setCategoria(null)}
        >
          Todo
        </button>
        {categorias.map((item) => (
          <button
            key={item.id}
            type="button"
            className={chip(categoria === item.id)}
            aria-pressed={categoria === item.id}
            onClick={() => setCategoria(item.id)}
          >
            <span aria-hidden>{item.emoji}</span> {item.nombre}
          </button>
        ))}
      </div>

      {visibles.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visibles.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              cantidad={carrito[producto.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-muted">
          No encontramos productos para “{busqueda}”.
        </p>
      )}

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 p-3 backdrop-blur">
          <Link
            href="/carrito"
            className="mx-auto flex h-12 max-w-6xl items-center justify-between rounded-xl bg-brand px-5 font-medium text-brand-foreground hover:bg-brand-strong"
          >
            <span>
              Ver carrito · {unidades} {unidades === 1 ? "producto" : "productos"}
            </span>
            <span className="tabular-nums">{formatearPrecio(subtotal)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
