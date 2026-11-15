import type { Usuario } from "@super-pedidos/compartido";

export type Bindings = {
  DB: D1Database;
  // Orígenes web que pueden llamar a la API, separados por coma.
  ORIGENES_PERMITIDOS: string;
  // Remitente de los códigos de acceso, en un dominio verificado en Resend.
  CORREO_REMITENTE: string;
  // Alias de la plantilla publicada en Resend (variables CODE y USER_NAME). Sin ella se manda
  // el correo con el diseño que trae la API.
  RESEND_PLANTILLA?: string;
  // Secret del Worker (wrangler secret put RESEND_API_KEY). Sin ella no se envían códigos.
  RESEND_API_KEY?: string;
  // "1" solo en desarrollo local: el código se muestra en la terminal en vez de enviarse.
  CODIGOS_EN_CONSOLA?: string;
};

export type Entorno = {
  Bindings: Bindings;
  Variables: { usuario: Usuario };
};
