// Crea un usuario del panel (central o de un local).
//
//   npm run crear-usuario -w @super-pedidos/api -- \
//     --usuario ana --nombre "Ana López" --rol local --local centro --clave "una-clave-larga" [--remoto]
//
// Sin --remoto se crea en la base de datos local de desarrollo.

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { hashearClave } from "../src/claves";

const { values } = parseArgs({
  options: {
    usuario: { type: "string" },
    nombre: { type: "string" },
    rol: { type: "string" },
    local: { type: "string" },
    clave: { type: "string" },
    remoto: { type: "boolean", default: false },
  },
});

function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

const usuario = values.usuario?.trim().toLowerCase();
const nombre = values.nombre?.trim();
const { rol, local, clave } = values;

if (!usuario || !/^[a-z0-9._-]{3,40}$/.test(usuario)) {
  salir("--usuario es obligatorio: 3 a 40 letras minúsculas, números, punto, guion o guion bajo.");
}
if (!nombre) salir("--nombre es obligatorio.");
if (rol !== "central" && rol !== "local") salir('--rol debe ser "central" o "local".');
if (rol === "local" && !local) salir("--local es obligatorio para usuarios de un local.");
if (!clave || clave.length < 8) salir("--clave es obligatoria y debe tener al menos 8 caracteres.");

const sql = (valor: string | null) => (valor === null ? "NULL" : `'${valor.replace(/'/g, "''")}'`);
const comando = `INSERT INTO usuarios (id, nombre, usuario, clave_hash, rol, local_id) VALUES (${[
  sql(crypto.randomUUID()),
  sql(nombre),
  sql(usuario),
  sql(await hashearClave(clave)),
  sql(rol),
  sql(rol === "local" ? local! : null),
].join(", ")});`;

const resultado = spawnSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "super-pedidos",
    values.remoto ? "--remote" : "--local",
    "--command",
    comando,
  ],
  { stdio: "inherit" },
);
if (resultado.status !== 0) salir("No se pudo crear el usuario.");
console.log(`Usuario "${usuario}" creado (${rol}${rol === "local" ? `, local ${local}` : ""}).`);
