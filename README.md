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

## Importar el inventario de SAP

La pestaña **Importar SAP** está disponible para usuarios centrales y solo en la versión web. Acepta Excel (.xlsx), CSV o el texto que exporta SAP (.txt, incluso en UTF-16). El archivo se lee en la computadora y se manda por lotes, así que no importa cuánto pese: uno de 40 MB con 270 mil filas se importó en unos 15 segundos en pruebas locales.

1. **Archivo:** se reconocen solas las columnas habituales de SAP (Material, Texto breve de material, Centro, Libre utilización, UMB, EAN/UPC, Grupo de artículos, precio), aunque el reporte traiga títulos arriba o repita los encabezados por página.
2. **Columnas:** se pueden corregir, y se elige el formato de los números (1,234.56 o 1.234,56). La pantalla muestra cómo se lee un número de ejemplo.
3. **Revisión:** cada centro de SAP se asigna a una sucursal existente, a una sucursal nueva o se omite. Varios almacenes del mismo centro se suman.
4. **Importación:** si se corta, se reintenta desde el lote que falló.

Reglas:
- Una sucursal que recibe inventario de SAP solo muestra los productos que vienen en el archivo para su centro. Los que están en cero quedan **agotados**, y los que dejan de venir en una importación posterior también.
- Un dato que no viene en el archivo no borra el que ya existe. Por ejemplo, una lista de precios con solo "Material" y "Precio" actualiza precios sin tocar lo demás.
- Los productos sin precio no se pueden vender hasta que se les carga uno.
- Opcional: desactivar los productos que no vienen en el archivo. Úsalo solo con el inventario completo.

**Límites de Cloudflare:** el plan gratis de Workers permite 100 mil filas escritas y 5 millones leídas por día en D1. Un inventario real (decenas de miles de productos por varias sucursales) pasa ese límite en una sola importación, así que para usarlo con datos reales hace falta el plan **Workers Paid** (5 dólares al mes), que incluye 50 millones de escrituras al mes.

## Diseño

El estilo sigue a [Spectrum UI](https://github.com/arihantcodes/spectrum-ui) y [Aceternity UI](https://ui.aceternity.com). Esas librerías solo funcionan en páginas web, así que su look se rehízo con piezas que funcionan igual en web, iOS y Android:

- **[NativeWind](https://www.nativewind.dev)**: clases de Tailwind en React Native. La configuración está en `app/tailwind.config.js`.
- **expo-linear-gradient** para los bordes y botones con degradado.
- **react-native-svg** para el fondo de puntos y el foco de luz.
- **Reanimated** para el destello del botón principal, el punto que late en los pedidos nuevos y la aparición de las tarjetas.
- **[Lucide](https://lucide.dev)**: los mismos íconos que usan shadcn/ui y Spectrum UI. Se importan uno por uno desde `app/src/components/iconos.ts`. Importar desde `lucide-react-native` directamente mete más de mil íconos en la app.

La app siempre usa el tema oscuro. Los componentes base (tarjetas, botones, insignias, campos) están en `app/src/components/ui.tsx`.

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

## Ver la app en tu iPhone desde tu Mac

Con Xcode y tu Apple ID normal (gratis) se instala la app nativa en tu propio iPhone. La app que se instala así funciona 7 días; para renovarla, vuelves a correr `npm run iphone`. Para TestFlight o la App Store hace falta la cuenta de Apple Developer (99 dólares al año).

**Una sola vez:**

1. Instala **Xcode** desde la App Store, en su versión más reciente. Ábrelo una vez y acepta la licencia.
2. En Xcode → Settings → Accounts, agrega tu **Apple ID**. Aparece como "Personal Team".
3. Instala **Node.js** 20 o más reciente desde nodejs.org.
4. Conecta el iPhone a la Mac con el cable y toca **Confiar**. Luego activa en el iPhone Ajustes → Privacidad y seguridad → **Modo de desarrollador**; el iPhone se reinicia.
5. La Mac y el iPhone deben estar en la **misma red Wi-Fi**.

**En la Terminal de la Mac:**

```bash
git clone https://github.com/crisio/app-super-pedidos.git
cd app-super-pedidos
npm install
npm run local:preparar
npm run crear-usuario -w @super-pedidos/api -- --usuario admin --nombre "Central" --rol central --clave "una-clave-larga"
npm run api:red
```

`npm run api:red` deja la API corriendo en tu Mac, accesible desde el iPhone; deja esa ventana abierta. Si macOS pregunta si permites conexiones entrantes, acepta.

**En otra ventana de la Terminal:**

```bash
cd app-super-pedidos
npm run iphone
```

La primera vez tarda varios minutos: genera el proyecto de Xcode, instala las dependencias nativas (si pregunta por CocoaPods, acepta instalarlo) y compila. Elige tu iPhone cuando aparezca la lista de dispositivos. Si pide un equipo de firma, elige tu **Personal Team**.

**En el iPhone, la primera vez:**

- Ajustes → General → VPN y administración de dispositivos → tu Apple ID → **Confiar**.
- Al abrir la app, permite que busque dispositivos en la **red local**.

Entra con el usuario `admin` y la clave que pusiste. Para ver tu inventario en la app, impórtalo antes de compilar: corre `npm run app`, abre http://localhost:8081 en el navegador de la Mac, entra a **Importar SAP**, y luego cierra con Ctrl+C antes de `npm run iphone`.

Si la firma falla desde la Terminal, abre `app/ios/SuperPedidos.xcworkspace` en Xcode, elige tu equipo en Signing & Capabilities y presiona ▶︎ con el iPhone seleccionado.

## Publicar

Todo se publica solo desde GitHub Actions (`.github/workflows/publicar.yml`) cada vez que hay cambios en `main`:

| Pieza | Dónde vive | Dirección |
|---|---|---|
| App web | GitHub Pages | https://supercoquin.christopherpineda.com |
| API | Cloudflare Workers | https://supercoquin-api.christopherpineda.com |
| Base de datos | Cloudflare D1 (`super-pedidos`) | — |

GitHub Pages solo sirve archivos estáticos, así que la API sigue corriendo en Cloudflare Workers, aunque se publica desde GitHub. En pull requests el flujo solo revisa el código (tipos, lint y formato).

En cada publicación, el flujo:
1. Aplica las migraciones nuevas de `api/migrations/` a la base de datos.
2. Publica la API. Cloudflare crea solo el subdominio de la API y su certificado.
3. Crea o corrige en Cloudflare el subdominio `supercoquin` (un CNAME hacia `crisio.github.io`, sin proxy), con el script `.github/scripts/subdominio.sh`.
4. Construye la app web apuntando a la API y la publica en GitHub Pages.

### Configuración inicial (una sola vez)

1. **Token de Cloudflare.** Créalo en Cloudflare → My Profile → API Tokens → Create Custom Token, con estos permisos:
   - Account · Workers Scripts · Edit
   - Account · D1 · Edit
   - Account · Account Settings · Read
   - Zone · Zone · Read
   - Zone · DNS · Edit
   - Zone · Workers Routes · Edit

   En "Zone Resources" elige `christopherpineda.com`.
2. **Secrets en GitHub** (Settings → Secrets and variables → Actions → New repository secret):
   - `CLOUDFLARE_API_TOKEN`: el token del paso anterior.
   - `CLOUDFLARE_ACCOUNT_ID`: el ID de la cuenta de Cloudflare.
3. **GitHub Pages:** en Settings → Pages → Build and deployment, elige **GitHub Actions** como fuente.
4. Corre el flujo **Publicar** (Actions → Publicar → Run workflow) o sube un cambio a `main`.
5. Después de la primera publicación, en Settings → Pages → Custom domain, escribe `supercoquin.christopherpineda.com` y guarda. Cuando GitHub termine de verificarlo, activa **Enforce HTTPS**.

La app solo funciona en el subdominio, no en `crisio.github.io/app-super-pedidos`.

Nunca subas claves al código: el repositorio es público. Todo lo secreto va en los secrets de GitHub.

### iOS y Android

Se compilan en la nube con EAS (`npx eas-cli@latest build`), con `EXPO_PUBLIC_API_URL=https://supercoquin-api.christopherpineda.com`. Necesitas una cuenta de Expo, y cuentas de desarrollador de Apple y Google para publicar en las tiendas.

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
