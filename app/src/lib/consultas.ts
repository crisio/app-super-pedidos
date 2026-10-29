import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  Catalogo,
  DetallePedido,
  Estado,
  Local,
  NuevoPedido,
  ResumenPedido,
} from "@super-pedidos/compartido";
import { useApi } from "./sesion";

// Sin conexión en tiempo real todavía: la bandeja se actualiza sola cada 10 segundos.
const INTERVALO_ACTUALIZACION_MS = 10_000;

export type Vista = "activos" | "cerrados";

export function useLocales() {
  const api = useApi();
  return useQuery({
    queryKey: ["locales"],
    queryFn: () => api<Local[]>("/locales"),
    staleTime: 5 * 60_000,
  });
}

export function usePedidos(vista: Vista, localId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ["pedidos", vista, localId],
    queryFn: () => {
      const parametros = new URLSearchParams({ vista });
      if (localId) parametros.set("local", localId);
      return api<ResumenPedido[]>(`/pedidos?${parametros}`);
    },
    refetchInterval: INTERVALO_ACTUALIZACION_MS,
  });
}

export function usePedido(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["pedido", id],
    queryFn: () => api<DetallePedido>(`/pedidos/${encodeURIComponent(id)}`),
    refetchInterval: INTERVALO_ACTUALIZACION_MS,
  });
}

// Valor que solo cambia cuando se deja de escribir, para no buscar en cada tecla.
export function useValorPausado<T>(valor: T, esperaMs = 300) {
  const [pausado, setPausado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setPausado(valor), esperaMs);
    return () => clearTimeout(id);
  }, [valor, esperaMs]);
  return pausado;
}

export type FiltrosCatalogo = {
  busqueda?: string;
  categoria?: string | null;
  soloAgotados?: boolean;
  limite?: number;
  // Cuenta los agotados del local (cuesta una consulta más).
  contarAgotados?: boolean;
};

// El catálogo se busca en el servidor: con el inventario de SAP son miles de productos.
export function useCatalogo(localId: string | null, filtros: FiltrosCatalogo = {}) {
  const api = useApi();
  const {
    busqueda = "",
    categoria = null,
    soloAgotados = false,
    limite = 50,
    contarAgotados = false,
  } = filtros;
  return useQuery({
    queryKey: ["catalogo", localId, busqueda.trim(), categoria, soloAgotados, limite, contarAgotados],
    queryFn: () => {
      const parametros = new URLSearchParams({ limite: String(limite) });
      if (busqueda.trim()) parametros.set("q", busqueda.trim());
      if (categoria) parametros.set("categoria", categoria);
      if (soloAgotados) parametros.set("agotados", "1");
      if (contarAgotados) parametros.set("conteo", "1");
      return api<Catalogo>(`/locales/${encodeURIComponent(localId!)}/catalogo?${parametros}`);
    },
    enabled: localId !== null,
    placeholderData: keepPreviousData,
  });
}

export function useCrearPedido() {
  const api = useApi();
  const clienteConsultas = useQueryClient();
  return useMutation({
    mutationFn: ({ pedido, claveIdempotencia }: { pedido: NuevoPedido; claveIdempotencia: string }) =>
      api<DetallePedido>("/pedidos", {
        metodo: "POST",
        cuerpo: pedido,
        cabeceras: { "Idempotency-Key": claveIdempotencia },
      }),
    onSuccess: (pedido) => {
      clienteConsultas.setQueryData(["pedido", pedido.id], pedido);
      clienteConsultas.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
}

export function useCambiarEstado(id: string) {
  const api = useApi();
  const clienteConsultas = useQueryClient();
  return useMutation({
    mutationFn: ({ estado, nota }: { estado: Estado; nota?: string }) =>
      api<DetallePedido>(`/pedidos/${encodeURIComponent(id)}/estado`, {
        metodo: "POST",
        cuerpo: { estado, nota },
      }),
    onSuccess: (pedido) => {
      clienteConsultas.setQueryData(["pedido", id], pedido);
      clienteConsultas.invalidateQueries({ queryKey: ["pedidos"] });
    },
    // Si otra persona lo cambió primero, se recarga para mostrar el estado real.
    onError: () => clienteConsultas.invalidateQueries({ queryKey: ["pedido", id] }),
  });
}

export function useCambiarDisponibilidad(localId: string | null) {
  const api = useApi();
  const clienteConsultas = useQueryClient();
  // Todas las búsquedas del catálogo de este local.
  const clave = ["catalogo", localId];
  return useMutation({
    mutationFn: ({ productoId, disponible }: { productoId: string; disponible: boolean }) =>
      api(
        `/locales/${encodeURIComponent(localId!)}/productos/${encodeURIComponent(productoId)}/disponibilidad`,
        {
          metodo: "PUT",
          cuerpo: { disponible },
        },
      ),
    // Se refleja al instante y se revierte si falla.
    onMutate: async ({ productoId, disponible }) => {
      await clienteConsultas.cancelQueries({ queryKey: clave });
      const anteriores = clienteConsultas.getQueriesData<Catalogo>({ queryKey: clave });
      clienteConsultas.setQueriesData<Catalogo>(
        { queryKey: clave },
        (actual) =>
          actual && {
            ...actual,
            productos: actual.productos.map((producto) =>
              producto.id === productoId ? { ...producto, disponible } : producto,
            ),
          },
      );
      return { anteriores };
    },
    onError: (_error, _variables, contexto) => {
      contexto?.anteriores.forEach(([claveConsulta, datos]) =>
        clienteConsultas.setQueryData(claveConsulta, datos),
      );
    },
    onSettled: () => clienteConsultas.invalidateQueries({ queryKey: clave }),
  });
}
