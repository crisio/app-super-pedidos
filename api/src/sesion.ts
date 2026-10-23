import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { Rol, Sesion, Usuario } from "@super-pedidos/compartido";
import { generarToken, hashearToken, verificarClave } from "./claves";
import { fallar, leerJson, texto } from "./errores";
import type { Entorno } from "./tipos";

const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

type FilaUsuario = {
  id: string;
  nombre: string;
  rol: Rol;
  local_id: string | null;
};

function aUsuario(fila: FilaUsuario): Usuario {
  return { id: fila.id, nombre: fila.nombre, rol: fila.rol, localId: fila.local_id };
}

function tokenDe(cabecera: string | undefined) {
  const [tipo, token] = (cabecera ?? "").split(" ");
  return tipo === "Bearer" && token ? token : null;
}

export const requiereSesion = createMiddleware<Entorno>(async (c, next) => {
  const token = tokenDe(c.req.header("Authorization"));
  if (!token) throw fallar(401, "Inicia sesión para continuar.");

  const fila = await c.env.DB.prepare(
    `SELECT u.id, u.nombre, u.rol, u.local_id
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expira_en > ? AND u.activo = 1`,
  )
    .bind(await hashearToken(token), new Date().toISOString())
    .first<FilaUsuario>();
  if (!fila) throw fallar(401, "Tu sesión expiró. Vuelve a iniciar sesión.");

  c.set("usuario", aUsuario(fila));
  await next();
});

// Un usuario de local solo puede trabajar con su propio local.
export function verificarAccesoLocal(usuario: Usuario, localId: string) {
  if (usuario.rol === "local" && usuario.localId !== localId) {
    throw fallar(403, "No tienes acceso a ese local.");
  }
}

export const rutasSesion = new Hono<Entorno>()
  .post("/", async (c) => {
    const cuerpo = await leerJson(c.req.raw);
    const nombreUsuario = texto(cuerpo.usuario, 60).toLowerCase();
    const clave = typeof cuerpo.clave === "string" ? cuerpo.clave : "";
    if (!nombreUsuario || !clave) throw fallar(400, "Escribe tu usuario y contraseña.");

    const ahora = new Date();
    const fila = await c.env.DB.prepare(
      `SELECT id, nombre, rol, local_id, clave_hash, intentos_fallidos, bloqueado_hasta
         FROM usuarios WHERE usuario = ? AND activo = 1`,
    )
      .bind(nombreUsuario)
      .first<
        FilaUsuario & { clave_hash: string; intentos_fallidos: number; bloqueado_hasta: string | null }
      >();

    if (fila?.bloqueado_hasta && fila.bloqueado_hasta > ahora.toISOString()) {
      throw fallar(429, "Demasiados intentos fallidos. Espera 15 minutos y vuelve a intentar.");
    }
    if (!fila || !(await verificarClave(clave, fila.clave_hash))) {
      if (fila) {
        const intentos = fila.intentos_fallidos + 1;
        const bloquear = intentos >= MAX_INTENTOS;
        await c.env.DB.prepare("UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?")
          .bind(
            bloquear ? 0 : intentos,
            bloquear ? new Date(ahora.getTime() + BLOQUEO_MS).toISOString() : null,
            fila.id,
          )
          .run();
      }
      throw fallar(401, "Usuario o contraseña incorrectos.");
    }

    const token = generarToken();
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?").bind(
        fila.id,
      ),
      c.env.DB.prepare(
        "INSERT INTO sesiones (token_hash, usuario_id, creada_en, expira_en) VALUES (?, ?, ?, ?)",
      ).bind(
        await hashearToken(token),
        fila.id,
        ahora.toISOString(),
        new Date(ahora.getTime() + DURACION_SESION_MS).toISOString(),
      ),
    ]);

    const sesion: Sesion = { token, usuario: aUsuario(fila) };
    return c.json(sesion, 201);
  })
  .get("/", requiereSesion, (c) => c.json(c.get("usuario")))
  .delete("/", async (c) => {
    const token = tokenDe(c.req.header("Authorization"));
    if (token) {
      await c.env.DB.prepare("DELETE FROM sesiones WHERE token_hash = ?")
        .bind(await hashearToken(token))
        .run();
    }
    return c.body(null, 204);
  });
