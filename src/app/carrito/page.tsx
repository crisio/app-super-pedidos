import type { Metadata } from "next";
import { VistaCarrito } from "@/components/vista-carrito";

export const metadata: Metadata = {
  title: "Carrito",
};

export default function PaginaCarrito() {
  return <VistaCarrito />;
}
