"use client";

import { cambiarCantidad } from "@/lib/carrito";
import { MAX_POR_PRODUCTO } from "@/lib/pedido";

type Props = {
  id: string;
  nombre: string;
  cantidad: number;
  className?: string;
};

export function ControlCantidad({ id, nombre, cantidad, className = "" }: Props) {
  const boton =
    "grid size-9 place-items-center rounded-lg text-lg font-semibold text-brand hover:bg-brand-soft disabled:opacity-40";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-border bg-surface ${className}`}
    >
      <button
        type="button"
        className={boton}
        aria-label={`Quitar uno: ${nombre}`}
        onClick={() => cambiarCantidad(id, cantidad - 1)}
      >
        −
      </button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {cantidad}
      </span>
      <button
        type="button"
        className={boton}
        aria-label={`Agregar uno: ${nombre}`}
        disabled={cantidad >= MAX_POR_PRODUCTO}
        onClick={() => cambiarCantidad(id, cantidad + 1)}
      >
        +
      </button>
    </div>
  );
}
