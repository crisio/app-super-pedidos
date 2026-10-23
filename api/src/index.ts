import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { ErrorApi } from "@super-pedidos/compartido";
import { rutasCatalogo } from "./catalogo";
import { rutasPedidos } from "./pedidos";
import { rutasSesion } from "./sesion";
import type { Entorno } from "./tipos";

const app = new Hono<Entorno>();

app.use("*", (c, next) => {
  const permitidos = c.env.ORIGENES_PERMITIDOS.split(",").map((origen) => origen.trim());
  return cors({
    origin: (origen) => (permitidos.includes(origen) ? origen : null),
    allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) => c.json({ servicio: "Super Pedidos API", estado: "ok" }));
app.route("/sesion", rutasSesion);
app.route("/pedidos", rutasPedidos);
app.route("/locales", rutasCatalogo);

app.notFound((c) => c.json<ErrorApi>({ error: "Ruta no encontrada." }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse();
  console.error(error);
  return c.json<ErrorApi>({ error: "Ocurrió un error en el servidor. Intenta de nuevo." }, 500);
});

export default app;
