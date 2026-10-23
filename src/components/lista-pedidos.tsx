"use client";

import Link from "next/link";
import { useMisPedidos } from "@/lib/mis-pedidos";
import { metodosPago, tiposEntrega } from "@/lib/pedido";
import { formatearPrecio } from "@/lib/productos";
import { ResumenTotales } from "./resumen-totales";

const formatoFecha = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ListaPedidos() {
  const pedidos = useMisPedidos();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Mis pedidos</h1>
      <p className="mt-1 text-muted">Los pedidos que hiciste desde este dispositivo.</p>

      {pedidos.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-muted">Todavía no has hecho ningún pedido.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-medium text-brand-foreground hover:bg-brand-strong"
          >
            Hacer mi primer pedido
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {pedidos.map((pedido) => (
            <li key={pedido.numero}>
              <details className="group rounded-2xl border border-border bg-surface">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 sm:p-5">
                  <div>
                    <p className="font-mono font-semibold">{pedido.numero}</p>
                    <p className="text-sm text-muted">
                      {formatoFecha.format(new Date(pedido.fecha))} · {tiposEntrega[pedido.entrega]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
                      Recibido
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatearPrecio(pedido.total)}
                    </span>
                    <span aria-hidden className="text-muted transition group-open:rotate-180">
                      ▾
                    </span>
                  </div>
                </summary>
                <div className="border-t border-border p-4 sm:p-5">
                  <ul className="space-y-2 text-sm">
                    {pedido.lineas.map((linea) => (
                      <li key={linea.id} className="flex justify-between gap-3">
                        <span>
                          <span aria-hidden>{linea.emoji}</span> {linea.cantidad} × {linea.nombre}
                        </span>
                        <span className="tabular-nums">{formatearPrecio(linea.importe)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-border pt-4">
                    <ResumenTotales
                      subtotal={pedido.subtotal}
                      envio={pedido.envio}
                      total={pedido.total}
                      entrega={pedido.entrega}
                    />
                  </div>
                  <p className="mt-4 text-sm text-muted">
                    {metodosPago[pedido.pago]}
                    {pedido.cliente.direccion && ` · ${pedido.cliente.direccion}`}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
