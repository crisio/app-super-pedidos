import { HTTPException } from "hono/http-exception";
import type { ErrorApi } from "@super-pedidos/compartido";

export function fallar(
  status: 400 | 401 | 403 | 404 | 409 | 429,
  error: string,
  campos?: Record<string, string>,
) {
  const cuerpo: ErrorApi = campos ? { error, campos } : { error };
  return new HTTPException(status, {
    res: new Response(JSON.stringify(cuerpo), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  });
}

export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo: unknown = await request.json();
    if (cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)) {
      return cuerpo as Record<string, unknown>;
    }
  } catch {
    // Se responde abajo con el mismo error.
  }
  throw fallar(400, "El cuerpo de la solicitud debe ser un objeto JSON.");
}

export function texto(valor: unknown, maximo = 200) {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}
