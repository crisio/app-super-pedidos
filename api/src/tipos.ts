import type { Usuario } from "@super-pedidos/compartido";

export type Bindings = {
  DB: D1Database;
  // Orígenes web que pueden llamar a la API, separados por coma.
  ORIGENES_PERMITIDOS: string;
};

export type Entorno = {
  Bindings: Bindings;
  Variables: { usuario: Usuario };
};
