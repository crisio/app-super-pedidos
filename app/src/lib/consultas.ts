import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useCatalogo(localId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ["catalogo", localId],
    queryFn: () => api<Catalogo>(`/locales/${encodeURIComponent(localId!)}/catalogo`),
    enabled: localId !== null,
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
      const anterior = clienteConsultas.getQueryData<Catalogo>(clave);
      clienteConsultas.setQueryData<Catalogo>(
        clave,
        (actual) =>
          actual && {
            ...actual,
            productos: actual.productos.map((producto) =>
              producto.id === productoId ? { ...producto, disponible } : producto,
            ),
          },
      );
      return { anterior };
    },
    onError: (_error, _variables, contexto) => {
      if (contexto?.anterior) clienteConsultas.setQueryData(clave, contexto.anterior);
    },
    onSettled: () => clienteConsultas.invalidateQueries({ queryKey: clave }),
  });
}
