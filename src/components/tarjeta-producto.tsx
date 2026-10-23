"use client";

import { cambiarCantidad } from "@/lib/carrito";
import { formatearPrecio, type Producto } from "@/lib/productos";
import { ControlCantidad } from "./control-cantidad";

type Props = {
  producto: Producto;
  cantidad: number;
};

export function TarjetaProducto({ producto, cantidad }: Props) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div
        aria-hidden
        className="grid aspect-[4/3] place-items-center rounded-xl bg-brand-soft text-5xl sm:text-6xl"
      >
        {producto.emoji}
      </div>
      <h3 className="mt-3 font-medium leading-snug">{producto.nombre}</h3>
      <p className="text-sm text-muted">{producto.unidad}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{formatearPrecio(producto.precio)}</p>
      <div className="mt-auto pt-3">
        {cantidad === 0 ? (
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-brand font-medium text-brand-foreground hover:bg-brand-strong"
            aria-label={`Agregar ${producto.nombre}`}
            onClick={() => cambiarCantidad(producto.id, 1)}
          >
            Agregar
          </button>
        ) : (
          <ControlCantidad
            id={producto.id}
            nombre={producto.nombre}
            cantidad={cantidad}
            className="h-11"
          />
        )}
      </div>
    </article>
  );
}
