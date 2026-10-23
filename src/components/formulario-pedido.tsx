"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { crearPedido } from "@/app/acciones";
import { useResumenCarrito, vaciarCarrito } from "@/lib/carrito";
import { guardarPedido } from "@/lib/mis-pedidos";
import {
  calcularTotales,
  metodosPago,
  tiposEntrega,
  type MetodoPago,
  type ResultadoPedido,
  type TipoEntrega,
} from "@/lib/pedido";
import { formatearPrecio } from "@/lib/productos";
import { ResumenTotales } from "./resumen-totales";

const campo =
  "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="mt-1 text-sm text-danger">
      {mensaje}
    </p>
  );
}

function Opcion({
  name,
  value,
  etiqueta,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  etiqueta: string;
  checked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
      <input
        type="radio"
        name={name}
        value={value}
        required
        checked={checked}
        onChange={onChange}
        className="size-4 accent-brand"
      />
      {etiqueta}
    </label>
  );
}

export function FormularioPedido() {
  const { carrito, lineas } = useResumenCarrito();
  const [entrega, setEntrega] = useState<TipoEntrega>("domicilio");
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  if (resultado?.ok) {
    return <Confirmacion resultado={resultado} />;
  }

  if (lineas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <h1 className="text-xl font-semibold">No hay productos en tu carrito</h1>
        <p className="mt-1 text-muted">Agrega productos antes de hacer tu pedido.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-medium text-brand-foreground hover:bg-brand-strong"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  const totales = calcularTotales(lineas, entrega);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciarEnvio(async () => {
      const respuesta = await crearPedido(datos);
      // En el mismo paso que se vacía el carrito, para no mostrar "carrito vacío".
      setResultado(respuesta);
      if (respuesta.ok) {
        guardarPedido(respuesta.pedido);
        vaciarCarrito();
      }
    });
  }

  return (
    <form
      onSubmit={enviar}
      // Al corregir el formulario se ocultan los errores del intento anterior.
      onChange={() => resultado && setResultado(null)}
      className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start"
    >
      <input type="hidden" name="carrito" value={JSON.stringify(carrito)} />

      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Confirma tu pedido</h1>

        <fieldset className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 font-semibold">Tus datos</legend>
          <label className="block">
            <span className="text-sm font-medium">Nombre completo</span>
            <input
              name="nombre"
              required
              minLength={2}
              autoComplete="name"
              className={campo}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? "error-nombre" : undefined}
            />
            <MensajeError id="error-nombre" mensaje={errores.nombre} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Teléfono</span>
            <input
              name="telefono"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="9999-9999"
              pattern="\d{4}[\s-]?\d{4}"
              title="8 dígitos, por ejemplo 9999-9999"
              className={campo}
              aria-invalid={Boolean(errores.telefono)}
              aria-describedby={errores.telefono ? "error-telefono" : undefined}
            />
            <MensajeError id="error-telefono" mensaje={errores.telefono} />
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 font-semibold">Entrega</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(tiposEntrega) as TipoEntrega[]).map((tipo) => (
              <Opcion
                key={tipo}
                name="entrega"
                value={tipo}
                etiqueta={tiposEntrega[tipo]}
                checked={entrega === tipo}
                onChange={() => setEntrega(tipo)}
              />
            ))}
          </div>
          <MensajeError id="error-entrega" mensaje={errores.entrega} />
          {entrega === "domicilio" && (
            <label className="block">
              <span className="text-sm font-medium">Dirección de entrega</span>
              <textarea
                name="direccion"
                required
                minLength={5}
                rows={3}
                autoComplete="street-address"
                placeholder="Colonia, calle, número de casa y una referencia"
                className={campo}
                aria-invalid={Boolean(errores.direccion)}
                aria-describedby={errores.direccion ? "error-direccion" : undefined}
              />
              <MensajeError id="error-direccion" mensaje={errores.direccion} />
            </label>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 font-semibold">Pago</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(metodosPago) as MetodoPago[]).map((metodo) => (
              <Opcion key={metodo} name="pago" value={metodo} etiqueta={metodosPago[metodo]} />
            ))}
          </div>
          <MensajeError id="error-pago" mensaje={errores.pago} />
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface p-5">
          <legend className="px-1 font-semibold">Notas (opcional)</legend>
          <textarea
            name="notas"
            rows={3}
            maxLength={500}
            placeholder="Por ejemplo: si no hay un producto, cambiarlo por otro similar."
            className={campo}
            aria-label="Notas para el pedido"
          />
        </fieldset>
      </div>

      <aside className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Tu pedido</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {lineas.map(({ producto, cantidad, importe }) => (
            <li key={producto.id} className="flex justify-between gap-3">
              <span>
                {cantidad} × {producto.nombre}
              </span>
              <span className="tabular-nums">{formatearPrecio(importe)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <ResumenTotales {...totales} entrega={entrega} />
        </div>
        <MensajeError id="error-carrito" mensaje={errores.carrito} />
        <button
          type="submit"
          disabled={enviando}
          className="mt-5 h-12 w-full rounded-xl bg-brand font-medium text-brand-foreground hover:bg-brand-strong disabled:opacity-60"
        >
          {enviando ? "Enviando pedido…" : `Hacer pedido · ${formatearPrecio(totales.total)}`}
        </button>
        <Link href="/carrito" className="mt-3 block text-center text-sm font-medium text-brand hover:underline">
          Volver al carrito
        </Link>
      </aside>
    </form>
  );
}

function Confirmacion({ resultado }: { resultado: Extract<ResultadoPedido, { ok: true }> }) {
  const { pedido } = resultado;
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
      <p className="text-5xl" aria-hidden>
        ✅
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">¡Recibimos tu pedido!</h1>
      <p className="mt-2 text-muted">
        Pedido <span className="font-mono font-semibold text-foreground">{pedido.numero}</span>. Te
        llamaremos al {pedido.cliente.telefono} para confirmarlo.
      </p>
      <div className="mt-6 rounded-xl bg-brand-soft p-4 text-left text-sm">
        <p>
          <span className="font-medium">{tiposEntrega[pedido.entrega]}</span>
          {pedido.cliente.direccion && `: ${pedido.cliente.direccion}`}
        </p>
        <p className="mt-1">{metodosPago[pedido.pago]}</p>
        <p className="mt-1 font-semibold">Total: {formatearPrecio(pedido.total)}</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/pedidos"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 font-medium text-brand-foreground hover:bg-brand-strong"
        >
          Ver mis pedidos
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 font-medium hover:border-brand"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
