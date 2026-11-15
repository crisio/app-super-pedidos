// Pone o cambia el correo con el que un usuario entra al panel.
//
//   npm run correo-usuario -w @super-pedidos/api -- --usuario admin --correo tu@correo.com [--remoto]
//
// Sin --remoto se cambia en la base de datos local de desarrollo.

import { parseArgs } from "node:util";
import { CORREO_VALIDO, ejecutar, salir, sql } from "./d1";

const { values } = parseArgs({
  options: {
    usuario: { type: "string" },
    correo: { type: "string" },
    remoto: { type: "boolean", default: false },
  },
});

const usuario = values.usuario?.trim().toLowerCase();
const correo = values.correo?.trim().toLowerCase();
if (!usuario) salir("--usuario es obligatorio.");
if (!correo || !CORREO_VALIDO.test(correo)) salir("--correo es obligatorio y debe ser un correo válido.");

if (
  !ejecutar(`UPDATE usuarios SET correo = ${sql(correo)} WHERE usuario = ${sql(usuario)};`, values.remoto)
) {
  salir("No se pudo cambiar el correo. ¿Ya lo tiene otro usuario?");
}
console.log(`Listo: "${usuario}" entra con ${correo}. Si no existe ese usuario, no se cambió nada.`);
