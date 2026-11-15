// Crea un usuario del panel (central o de un local). Entra con el código que le llega
// a su correo, con su contraseña, o con ambos.
//
//   npm run crear-usuario -w @super-pedidos/api -- \
//     --usuario ana --nombre "Ana López" --rol local --local centro --correo ana@ejemplo.com [--clave "una-clave-larga"] [--remoto]
//
// Sin --remoto se crea en la base de datos local de desarrollo.

import { parseArgs } from "node:util";
import { hashearClave } from "../src/claves";
import { CORREO_VALIDO, ejecutar, salir, sql } from "./d1";

const { values } = parseArgs({
  options: {
    usuario: { type: "string" },
    nombre: { type: "string" },
    rol: { type: "string" },
    local: { type: "string" },
    correo: { type: "string" },
    clave: { type: "string" },
    remoto: { type: "boolean", default: false },
  },
});

const usuario = values.usuario?.trim().toLowerCase();
const nombre = values.nombre?.trim();
const correo = values.correo?.trim().toLowerCase() || null;
const { rol, local, clave } = values;

if (!usuario || !/^[a-z0-9._-]{3,40}$/.test(usuario)) {
  salir("--usuario es obligatorio: 3 a 40 letras minúsculas, números, punto, guion o guion bajo.");
}
if (!nombre) salir("--nombre es obligatorio.");
if (rol !== "central" && rol !== "local") salir('--rol debe ser "central" o "local".');
if (rol === "local" && !local) salir("--local es obligatorio para usuarios de un local.");
if (!correo && !clave) salir("Pon --correo, --clave o ambos: es como va a entrar.");
if (correo && !CORREO_VALIDO.test(correo)) salir("--correo no es un correo válido.");
if (clave !== undefined && clave.length < 8) salir("--clave debe tener al menos 8 caracteres.");

// Sin contraseña, clave_hash queda vacío y solo se puede entrar con el código por correo.
const comando = `INSERT INTO usuarios (id, nombre, usuario, correo, clave_hash, rol, local_id) VALUES (${[
  sql(crypto.randomUUID()),
  sql(nombre),
  sql(usuario),
  sql(correo),
  sql(clave ? await hashearClave(clave) : ""),
  sql(rol),
  sql(rol === "local" ? local! : null),
].join(", ")});`;

if (!ejecutar(comando, values.remoto)) salir("No se pudo crear el usuario.");
console.log(`Usuario "${usuario}" creado (${rol}${rol === "local" ? `, local ${local}` : ""}).`);
