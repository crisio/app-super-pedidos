// Correos con los que un usuario entra al panel: puede tener varios.
//
//   npm run correo-usuario -w @super-pedidos/api -- --usuario admin --correo tu@correo.com [--correo otro@correo.com] [--remoto]
//   npm run correo-usuario -w @super-pedidos/api -- --usuario admin --quitar --correo viejo@correo.com [--remoto]
//   npm run correo-usuario -w @super-pedidos/api -- --usuario admin [--remoto]      (solo los muestra)
//
// Sin --remoto se cambia en la base de datos local de desarrollo.

import { parseArgs } from "node:util";
import { CORREO_VALIDO, ejecutar, salir, sql } from "./d1";

const { values } = parseArgs({
  options: {
    usuario: { type: "string" },
    correo: { type: "string", multiple: true },
    quitar: { type: "boolean", default: false },
    remoto: { type: "boolean", default: false },
  },
});

const usuario = values.usuario?.trim().toLowerCase();
const correos = (values.correo ?? []).map((correo) => correo.trim().toLowerCase()).filter(Boolean);
if (!usuario) salir("--usuario es obligatorio.");
const invalido = correos.find((correo) => !CORREO_VALIDO.test(correo));
if (invalido) salir(`"${invalido}" no es un correo válido.`);
if (values.quitar && correos.length === 0) salir("Pon con --correo los correos que quieres quitar.");

const idUsuario = `(SELECT id FROM usuarios WHERE usuario = ${sql(usuario)})`;
const comandos = values.quitar
  ? correos.map(
      (correo) => `DELETE FROM correos_usuario WHERE correo = ${sql(correo)} AND usuario_id = ${idUsuario};`,
    )
  : correos.map(
      (correo) =>
        `INSERT INTO correos_usuario (correo, usuario_id) SELECT ${sql(correo)}, id FROM usuarios WHERE usuario = ${sql(usuario)};`,
    );
comandos.push(`SELECT correo FROM correos_usuario WHERE usuario_id = ${idUsuario} ORDER BY correo;`);

if (!ejecutar(comandos.join("\n"), values.remoto)) {
  salir("No se pudo cambiar. ¿Algún correo ya lo tiene otro usuario?");
}
console.log(`Arriba están los correos con los que "${usuario}" entra ahora.`);
