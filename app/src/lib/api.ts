import type { ErrorApi } from "@super-pedidos/compartido";

// En un celular o emulador, "localhost" no es tu computadora: usa la IP de tu red
// en EXPO_PUBLIC_API_URL (por ejemplo http://192.168.1.20:8787).
export const URL_API = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

export class ErrorDeApi extends Error {
  constructor(
    public status: number,
    mensaje: string,
    public campos: Record<string, string> = {},
  ) {
    super(mensaje);
  }
}

export type OpcionesLlamada = {
  metodo?: "GET" | "POST" | "PUT" | "DELETE";
  cuerpo?: unknown;
  token?: string | null;
  cabeceras?: Record<string, string>;
};

export async function llamarApi<T>(ruta: string, opciones: OpcionesLlamada = {}): Promise<T> {
  const cabeceras: Record<string, string> = { ...opciones.cabeceras };
  if (opciones.cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  if (opciones.token) cabeceras.Authorization = `Bearer ${opciones.token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
  } catch {
    throw new ErrorDeApi(0, "No hay conexión con el servidor. Revisa tu internet.");
  }

  if (respuesta.status === 204) return undefined as T;
  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = datos as Partial<ErrorApi> | null;
    throw new ErrorDeApi(
      respuesta.status,
      error?.error ?? "Ocurrió un error. Intenta de nuevo.",
      error?.campos ?? {},
    );
  }
  return datos as T;
}

export function mensajeDeError(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error. Intenta de nuevo.";
}
