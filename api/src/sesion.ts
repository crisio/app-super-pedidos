import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { Rol, Sesion, Usuario } from "@super-pedidos/compartido";
import { generarToken, hashearToken, verificarClave } from "./claves";
import {
  correoConfigurado,
  correoValido,
  enviarCodigo,
  generarCodigo,
  hashearCodigo,
  MINUTOS_CODIGO,
} from "./correo";
import { fallar, leerJson, texto } from "./errores";
import type { Entorno } from "./tipos";

const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
// Códigos por correo: cuántos se pueden pedir por hora, cada cuánto y cuántas veces se puede fallar uno.
const MAX_CODIGOS_POR_HORA = 5;
const ESPERA_ENTRE_CODIGOS_MS = 30 * 1000;
const MAX_INTENTOS_CODIGO = 5;

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

async function abrirSesion(db: D1Database, fila: FilaUsuario, ahora: Date) {
  const token = generarToken();
  await db.batch([
    db
      .prepare("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?")
      .bind(fila.id),
    db
      .prepare("INSERT INTO sesiones (token_hash, usuario_id, creada_en, expira_en) VALUES (?, ?, ?, ?)")
      .bind(
        await hashearToken(token),
        fila.id,
        ahora.toISOString(),
        new Date(ahora.getTime() + DURACION_SESION_MS).toISOString(),
      ),
  ]);
  const sesion: Sesion = { token, usuario: aUsuario(fila) };
  return sesion;
}

function leerCorreo(valor: unknown) {
  const correo = texto(valor, 254).toLowerCase();
  if (!correoValido(correo)) {
    throw fallar(400, "Escribe un correo válido.", { correo: "Escribe un correo válido." });
  }
  return correo;
}

// Comparación en tiempo constante de dos hashes en base64.
function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
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

    return c.json(await abrirSesion(c.env.DB, fila, ahora), 201);
  })
  // Paso 1 de la entrada por correo: envía un código de 6 dígitos.
  .post("/codigo", async (c) => {
    const correo = leerCorreo((await leerJson(c.req.raw)).correo);
    if (!correoConfigurado(c.env)) {
      throw fallar(503, "La entrada por correo todavía no está configurada. Entra con usuario y contraseña.");
    }

    const ahora = new Date();
    const fila = await c.env.DB.prepare(
      "SELECT id, nombre, rol, local_id FROM usuarios WHERE correo = ? AND activo = 1",
    )
      .bind(correo)
      .first<FilaUsuario>();
    // La misma respuesta si el correo no tiene cuenta, para no revelar quién la tiene.
    if (!fila) return c.body(null, 204);

    const recientes = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total, MAX(creado_en) AS ultimo FROM codigos_acceso WHERE usuario_id = ? AND creado_en > ?",
    )
      .bind(fila.id, new Date(ahora.getTime() - 60 * 60 * 1000).toISOString())
      .first<{ total: number; ultimo: string | null }>();
    if (
      recientes?.ultimo &&
      recientes.ultimo > new Date(ahora.getTime() - ESPERA_ENTRE_CODIGOS_MS).toISOString()
    ) {
      throw fallar(429, "Ya te enviamos un código. Espera unos segundos antes de pedir otro.");
    }
    if ((recientes?.total ?? 0) >= MAX_CODIGOS_POR_HORA) {
      throw fallar(429, "Pediste muchos códigos. Espera una hora o entra con tu contraseña.");
    }

    const id = crypto.randomUUID();
    const codigo = generarCodigo();
    await c.env.DB.prepare(
      "INSERT INTO codigos_acceso (id, usuario_id, codigo_hash, creado_en, vence_en) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        id,
        fila.id,
        await hashearCodigo(id, codigo),
        ahora.toISOString(),
        new Date(ahora.getTime() + MINUTOS_CODIGO * 60 * 1000).toISOString(),
      )
      .run();

    try {
      await enviarCodigo(c.env, { correo, nombre: fila.nombre }, codigo, id);
    } catch {
      await c.env.DB.prepare("DELETE FROM codigos_acceso WHERE id = ?").bind(id).run();
      throw fallar(502, "No pudimos enviar el correo. Intenta de nuevo en un momento.");
    }
    return c.body(null, 204);
  })
  // Paso 2: cambia el código por una sesión. Solo vale el último código, una vez.
  .post("/codigo/verificar", async (c) => {
    const cuerpo = await leerJson(c.req.raw);
    const correo = leerCorreo(cuerpo.correo);
    const codigo = texto(cuerpo.codigo, 20).replace(/\s/g, "");
    if (!/^\d{6}$/.test(codigo)) {
      throw fallar(400, "El código tiene 6 números.", { codigo: "El código tiene 6 números." });
    }

    const ahora = new Date();
    const fila = await c.env.DB.prepare(
      "SELECT id, nombre, rol, local_id FROM usuarios WHERE correo = ? AND activo = 1",
    )
      .bind(correo)
      .first<FilaUsuario>();
    const pendiente = fila
      ? await c.env.DB.prepare(
          `SELECT id, codigo_hash, vence_en, intentos FROM codigos_acceso
            WHERE usuario_id = ? AND usado_en IS NULL ORDER BY creado_en DESC LIMIT 1`,
        )
          .bind(fila.id)
          .first<{ id: string; codigo_hash: string; vence_en: string; intentos: number }>()
      : null;
    if (!fila || !pendiente || pendiente.vence_en <= ahora.toISOString()) {
      throw fallar(401, "El código venció o ya se usó. Pide uno nuevo.");
    }
    if (pendiente.intentos >= MAX_INTENTOS_CODIGO) {
      throw fallar(429, "Fallaste este código demasiadas veces. Pide uno nuevo.");
    }

    if (!iguales(await hashearCodigo(pendiente.id, codigo), pendiente.codigo_hash)) {
      await c.env.DB.prepare("UPDATE codigos_acceso SET intentos = intentos + 1 WHERE id = ?")
        .bind(pendiente.id)
        .run();
      const quedan = MAX_INTENTOS_CODIGO - pendiente.intentos - 1;
      throw fallar(
        401,
        quedan > 0
          ? `Código incorrecto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.`
          : "Código incorrecto. Pide uno nuevo.",
        { codigo: "Código incorrecto." },
      );
    }

    // Marcarlo como usado antes de abrir la sesión evita que el mismo código sirva dos veces.
    const marcado = await c.env.DB.prepare(
      "UPDATE codigos_acceso SET usado_en = ? WHERE id = ? AND usado_en IS NULL",
    )
      .bind(ahora.toISOString(), pendiente.id)
      .run();
    if (marcado.meta.changes !== 1) throw fallar(401, "El código venció o ya se usó. Pide uno nuevo.");

    return c.json(await abrirSesion(c.env.DB, fila, ahora), 201);
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
