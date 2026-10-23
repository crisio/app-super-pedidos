# Super Pedidos

Sistema central de pedidos para una cadena de supermercados con varios locales. Todos los pedidos llegan a una sola bandeja, sin importar el canal (app, WhatsApp, teléfono, redes o deliveries externos), y cada local marca qué productos tiene disponibles.

Una sola app para **web, iOS y Android** (Expo) y un servidor en **Cloudflare Workers + D1**.

## Qué hace hoy (fase 1: bandeja central)

- **Acceso por usuario y contraseña**, con dos tipos de usuario:
  - **Central**: ve los pedidos de todos los locales y captura pedidos para cualquiera.
  - **Local**: solo ve y atiende los pedidos de su local.
- **Bandeja de pedidos**:
  - Se actualiza sola cada 10 segundos.
  - En computadora muestra una columna por estado; en celular, una lista con filtros.
  - Marca en rojo los pedidos que llevan más de 5 minutos sin aceptarse.
  - La pestaña muestra cuántos pedidos nuevos hay.
- **Estados del pedido**: recibido → aceptado → preparando → listo → en camino → entregado, o cancelado con motivo. Si el pedido lo recoge el cliente o un delivery externo, pasa de "listo" a "entregado". Cada cambio queda en el historial con quién lo hizo.
- **Captura de pedidos** de WhatsApp, teléfono, redes o deliveries externos:
  - Solo deja elegir productos disponibles en el local elegido.
  - Calcula envío y tarifa de servicio.
  - No duplica el pedido si se toca dos veces el botón o se corta la red.
- **Disponibilidad por local**: un interruptor por producto para marcarlo agotado o disponible.
- **Contacto con el cliente**: botón para escribirle por WhatsApp con el estado del pedido ya redactado, y botón para llamar.

Reglas provisionales (en `compartido/src/pedidos.ts`): envío a domicilio L 60, gratis desde L 800; tarifa de servicio para deliveries externos L 30.

## Estructura

```
api/          Servidor: Cloudflare Worker (Hono) + base de datos D1
  migrations/   esquema de la base de datos
  semillas/     datos de demostración (3 locales, 30 productos)
  scripts/      crear-usuario.ts
app/          App Expo (web, iOS, Android)
  src/app/      pantallas (Expo Router)
compartido/   Estados, canales, reglas de precios y tipos que usan api y app
```

## Cómo correrlo en tu computadora

Necesitas Node.js 20 o más reciente.

```bash
npm install

# Base de datos local con datos de demostración y un usuario central
npm run db:migrar:local -w @super-pedidos/api
npm run db:demo:local -w @super-pedidos/api
npm run crear-usuario -w @super-pedidos/api -- --usuario admin --nombre "Central" --rol central --clave "una-clave-larga"

# En una terminal: el servidor (http://localhost:8787)
npm run api

# En otra terminal: la app web (http://localhost:8081)
npm run app
```

Para probar en un celular, instala **Expo Go**, corre `npm start -w @super-pedidos/app` y escanea el código QR. El celular no puede usar `localhost`: define `EXPO_PUBLIC_API_URL` con la IP de tu computadora, por ejemplo `EXPO_PUBLIC_API_URL=http://192.168.1.20:8787`.

Usuario de un local:

```bash
npm run crear-usuario -w @super-pedidos/api -- --usuario centro --nombre "Encargado Centro" --rol local --local centro --clave "otra-clave-larga"
```

Agrega `--remoto` para crearlo en la base de datos real en vez de la local.

Revisiones antes de subir cambios:

```bash
npm run typecheck
npm run lint
npm run format
```

## Publicar

La base de datos real (`super-pedidos` en Cloudflare D1) ya tiene el esquema, el catálogo de demostración y un usuario central `admin`.

1. **Servidor:**
   ```bash
   cd api
   npx wrangler login
   npx wrangler deploy
   ```
   Wrangler te da la dirección del servidor, por ejemplo `https://super-pedidos-api.<tu-subdominio>.workers.dev`.

2. **App web** (Cloudflare Pages):
   ```bash
   cd app
   EXPO_PUBLIC_API_URL=https://super-pedidos-api.<tu-subdominio>.workers.dev npx expo export --platform web
   npx wrangler pages deploy dist --project-name super-pedidos
   ```

3. **Permitir la web en el servidor:** agrega la dirección de la web (por ejemplo `https://super-pedidos.pages.dev`) a `ORIGENES_PERMITIDOS` en `api/wrangler.jsonc`, separada por coma, y vuelve a correr `npx wrangler deploy`.

4. **iOS y Android:** se compilan en la nube con EAS (`npx eas-cli@latest build`). Necesitas una cuenta de Expo, y cuentas de desarrollador de Apple y Google para publicar en las tiendas.

Si cambias el esquema, agrega una migración nueva en `api/migrations/` y aplícala con `npm run db:migrar:remoto -w @super-pedidos/api`.

## Próximas fases

1. **Fase 1, pendiente:**
   - App del cliente: catálogo según el local, carrito, pedido y seguimiento.
   - Pedidos de deliveries externos desde su propia cuenta.
   - App del repartidor propio.
2. **Fase 2:**
   - Preparación de pedidos con escáner de código de barras, faltantes y sustituciones.
   - Cupones y puntos de fidelidad.
   - Avisos automáticos por WhatsApp (API de WhatsApp Business).
   - Notificaciones push.
   - Reportes de tiempos.
3. **Fase 3:**
   - Conexión con el sistema de caja o inventario del súper.
   - Integración con PedidosYa y otras plataformas.
   - Modelo por sucursal para otras cadenas.
