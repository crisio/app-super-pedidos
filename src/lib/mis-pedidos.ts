import { useSyncExternalStore } from "react";
import { crearAlmacenLocal } from "./almacen-local";
import type { Pedido } from "./pedido";

// Historial de pedidos de este navegador, del más reciente al más antiguo.
const almacen = crearAlmacenLocal<Pedido[]>("super-pedidos:pedidos", []);

export function useMisPedidos() {
  return useSyncExternalStore(almacen.suscribir, almacen.leer, almacen.leerEnServidor);
}

export function guardarPedido(pedido: Pedido) {
  almacen.actualizar((actuales) => [
    pedido,
    ...actuales.filter((actual) => actual.numero !== pedido.numero),
  ]);
}
