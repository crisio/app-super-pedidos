import type { Metadata } from "next";
import { ListaPedidos } from "@/components/lista-pedidos";

export const metadata: Metadata = {
  title: "Mis pedidos",
};

export default function PaginaPedidos() {
  return <ListaPedidos />;
}
