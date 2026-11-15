// Ayudas para los scripts que escriben en la base de datos con wrangler.

import { spawnSync } from "node:child_process";

export function salir(mensaje: string): never {
  console.error(mensaje);
  process.exit(1);
}

// Valor de texto para SQL, con las comillas escapadas.
export const sql = (valor: string | null) => (valor === null ? "NULL" : `'${valor.replace(/'/g, "''")}'`);

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Corre el SQL en la base local de desarrollo o, con remoto, en la publicada.
export function ejecutar(comando: string, remoto: boolean) {
  const resultado = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "super-pedidos", remoto ? "--remote" : "--local", "--command", comando],
    { stdio: "inherit" },
  );
  return resultado.status === 0;
}
