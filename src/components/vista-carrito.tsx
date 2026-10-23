"use client";

import Link from "next/link";
import { cambiarCantidad, useResumenCarrito, vaciarCarrito } from "@/lib/carrito";
import { COSTO_ENVIO, ENVIO_GRATIS_DESDE } from "@/lib/pedido";
import { formatearPrecio } from "@/lib/productos";
import { ControlCantidad } from "./control-cantidad";

export function VistaCarrito() {
  const { lineas, unidades, subtotal } = useResumenCarrito();

  if (lineas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <p className="text-5xl" aria-hidden>
          🛒
        </p>
        <h1 className="mt-4 text-xl font-semibold">Tu carrito está vacío</h1>
        <p className="mt-1 text-muted">Agrega productos del catálogo para armar tu pedido.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-medium text-brand-foreground hover:bg-brand-strong"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  const faltaParaEnvioGratis = ENVIO_GRATIS_DESDE - subtotal;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tu carrito</h1>
          <button
            type="button"
            className="text-sm font-medium text-danger hover:underline"
            onClick={vaciarCarrito}
          >
            Vaciar carrito
          </button>
        </div>
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
          {lineas.map(({ producto, cantidad, importe }) => (
            <li key={producto.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
              <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-3xl"
              >
                {producto.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{producto.nombre}</p>
                <p className="text-sm text-muted">
                  {producto.unidad} · {formatearPrecio(producto.precio)}
                </p>
                <button
                  type="button"
                  className="mt-1 text-sm text-danger hover:underline"
                  aria-label={`Quitar ${producto.nombre} del carrito`}
                  onClick={() => cambiarCantidad(producto.id, 0)}
                >
                  Quitar
                </button>
              </div>
              <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
                <ControlCantidad
                  id={producto.id}
                  nombre={producto.nombre}
                  cantidad={cantidad}
                  className="w-32"
                />
                <p className="w-24 text-right font-semibold tabular-nums">
                  {formatearPrecio(importe)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Resumen</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">
              {unidades} {unidades === 1 ? "producto" : "productos"}
            </dt>
            <dd className="font-semibold tabular-nums">{formatearPrecio(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm">
          {faltaParaEnvioGratis > 0
            ? `Envío a domicilio: ${formatearPrecio(COSTO_ENVIO)}. Te faltan ${formatearPrecio(
                faltaParaEnvioGratis,
              )} para envío gratis.`
            : "¡Tu pedido tiene envío gratis!"}
        </p>
        <Link
          href="/checkout"
          className="mt-4 flex h-12 items-center justify-center rounded-xl bg-brand font-medium text-brand-foreground hover:bg-brand-strong"
        >
          Continuar con el pedido
        </Link>
        <Link href="/" className="mt-3 block text-center text-sm font-medium text-brand hover:underline">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
