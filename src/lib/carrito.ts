import { useMemo, useSyncExternalStore } from "react";
import { crearAlmacenLocal } from "./almacen-local";
import {
  armarLineas,
  calcularTotales,
  contarUnidades,
  MAX_POR_PRODUCTO,
  type Carrito,
} from "./pedido";

const almacen = crearAlmacenLocal<Carrito>("super-pedidos:carrito", {});

export function useCarrito() {
  return useSyncExternalStore(almacen.suscribir, almacen.leer, almacen.leerEnServidor);
}

export function useResumenCarrito() {
  const carrito = useCarrito();
  return useMemo(() => {
    const lineas = armarLineas(carrito);
    const { subtotal } = calcularTotales(lineas, "recoger");
    return { carrito, lineas, unidades: contarUnidades(lineas), subtotal };
  }, [carrito]);
}

export function cambiarCantidad(id: string, cantidad: number) {
  almacen.actualizar((actual) => {
    const siguiente = { ...actual };
    if (cantidad <= 0) {
      delete siguiente[id];
    } else {
      siguiente[id] = Math.min(cantidad, MAX_POR_PRODUCTO);
    }
    return siguiente;
  });
}

export function vaciarCarrito() {
  almacen.escribir({});
}
