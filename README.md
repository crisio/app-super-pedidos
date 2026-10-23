# Super Pedidos

App web para hacer pedidos de supermercado: el cliente arma su carrito, elige entrega a domicilio o recoger en tienda, y confirma su pedido.

Hecha con [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript y Tailwind CSS 4.

## Qué incluye

- **Catálogo** (`/`): productos por categoría, buscador (ignora tildes) y botón para agregar al carrito.
- **Carrito** (`/carrito`): cambiar cantidades, quitar productos y ver cuánto falta para el envío gratis.
- **Confirmar pedido** (`/checkout`): datos del cliente, tipo de entrega, método de pago y notas.
- **Mis pedidos** (`/pedidos`): historial de pedidos hechos desde ese dispositivo.

Reglas actuales: precios en Lempiras, envío a domicilio de L 60 y gratis desde L 800, máximo 50 unidades por producto. Están en `src/lib/pedido.ts`.

## Cómo correrla

Necesitas Node.js 20 o más reciente.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run lint   # revisa el código
npm run build  # compila para producción
npm start      # sirve la versión compilada
```

## Estructura

```
src/
  app/
    page.tsx            catálogo
    carrito/            carrito
    checkout/           confirmar pedido
    pedidos/            mis pedidos
    acciones.ts         acción del servidor que valida y crea el pedido
  components/           componentes de la interfaz
  lib/
    productos.ts        catálogo de ejemplo y formato de precios
    pedido.ts           reglas del pedido (totales, envío, tipos)
    carrito.ts          carrito guardado en el navegador
    mis-pedidos.ts      historial guardado en el navegador
```

El servidor recalcula siempre los totales con los precios del catálogo; no confía en los montos que envía el navegador.

## Pendiente

- **Base de datos**: el catálogo es una lista fija en `src/lib/productos.ts`, y los pedidos solo se guardan en el navegador del cliente. El siguiente paso es guardarlos en una base de datos (ver el `TODO` en `src/app/acciones.ts`).
- **Panel de la tienda** para ver y despachar pedidos, con cambio de estado (recibido, preparando, en camino, entregado).
- **Cuentas de cliente** para ver los pedidos desde cualquier dispositivo.
- **Pagos en línea** y avisos por WhatsApp o SMS.
