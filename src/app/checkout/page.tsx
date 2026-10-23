import type { Metadata } from "next";
import { FormularioPedido } from "@/components/formulario-pedido";

export const metadata: Metadata = {
  title: "Confirmar pedido",
};

export default function PaginaCheckout() {
  return <FormularioPedido />;
}
