import type { TipoEntrega } from "@/lib/pedido";
import { formatearPrecio } from "@/lib/productos";

type Props = {
  subtotal: number;
  envio: number;
  total: number;
  entrega: TipoEntrega;
};

export function ResumenTotales({ subtotal, envio, total, entrega }: Props) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="tabular-nums">{formatearPrecio(subtotal)}</dd>
      </div>
      {entrega === "domicilio" && (
        <div className="flex justify-between">
          <dt className="text-muted">Envío</dt>
          <dd className="tabular-nums">{envio === 0 ? "Gratis" : formatearPrecio(envio)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatearPrecio(total)}</dd>
      </div>
    </dl>
  );
}
