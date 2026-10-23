import { Catalogo } from "@/components/catalogo";
import { ENVIO_GRATIS_DESDE } from "@/lib/pedido";
import { formatearPrecio } from "@/lib/productos";

export default function Inicio() {
  return (
    <>
      <section className="mb-6 rounded-2xl bg-brand-soft px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tu súper, sin hacer fila
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Arma tu pedido y recíbelo en casa o recógelo en tienda. Envío gratis en compras desde{" "}
          {formatearPrecio(ENVIO_GRATIS_DESDE)}.
        </p>
      </section>
      <Catalogo />
    </>
  );
}
