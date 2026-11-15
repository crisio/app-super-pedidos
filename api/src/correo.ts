// Códigos de acceso de un solo uso y su envío por correo con Resend (https://resend.com).

import type { Bindings } from "./tipos";

export const MINUTOS_CODIGO = 10;

// 6 dígitos sin sesgo: se descartan los números que no caben completos en 000000–999999.
export function generarCodigo() {
  const limite = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const caja = new Uint32Array(1);
  do crypto.getRandomValues(caja);
  while (caja[0] >= limite);
  return String(caja[0] % 1_000_000).padStart(6, "0");
}

// Se guarda solo el hash; el id del código hace de sal.
export async function hashearCodigo(id: string, codigo: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${id}:${codigo}`));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

export function correoValido(correo: string) {
  return correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function correoConfigurado(env: Bindings) {
  return Boolean(env.RESEND_API_KEY) || env.CODIGOS_EN_CONSOLA === "1";
}

function escaparHtml(valor: string) {
  return valor.replace(
    /[&<>"']/g,
    (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]!,
  );
}

function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

// Diseño propio, por si no hay plantilla de Resend configurada.
function plantilla(nombre: string, codigo: string) {
  const saludo = nombre ? `Hola, ${escaparHtml(primerNombre(nombre))}.` : "Hola.";
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:18px;padding:32px 28px">
            <tr><td style="font-size:15px;font-weight:600;color:#0a8f62">Super Pedidos</td></tr>
            <tr><td style="padding-top:18px;font-size:17px;line-height:24px">${saludo} Tu código para entrar es:</td></tr>
            <tr><td style="padding:18px 0 22px;font-size:40px;line-height:44px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${codigo}</td></tr>
            <tr><td style="font-size:15px;line-height:21px;color:#6e6e73">Vence en ${MINUTOS_CODIGO} minutos. Si no lo pediste, ignora este correo: nadie puede entrar sin el código.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function enviarCodigo(
  env: Bindings,
  destino: { correo: string; nombre: string },
  codigo: string,
  idempotencia: string,
) {
  // Desarrollo local (npm run api): el código sale en la terminal en vez de enviarse.
  if (env.CODIGOS_EN_CONSOLA === "1") {
    console.log(`Código de acceso para ${destino.correo}: ${codigo}`);
    return;
  }

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencia,
    },
    body: JSON.stringify({
      from: env.CORREO_REMITENTE,
      to: [destino.correo],
      // El código en el asunto: se ve en la notificación y iOS lo ofrece encima del teclado.
      subject: `${codigo} es tu código de Super Pedidos`,
      ...(env.RESEND_PLANTILLA
        ? {
            // Con plantilla, Resend no acepta html ni text. EXPIRES_MINUTES se deja en el valor
            // por defecto de la plantilla (10), que coincide con MINUTOS_CODIGO.
            template: {
              id: env.RESEND_PLANTILLA,
              variables: { CODE: codigo, USER_NAME: primerNombre(destino.nombre) },
            },
          }
        : {
            html: plantilla(destino.nombre, codigo),
            text: `Tu código para entrar a Super Pedidos es ${codigo}. Vence en ${MINUTOS_CODIGO} minutos. Si no lo pediste, ignora este correo.`,
          }),
    }),
  });
  if (!respuesta.ok) {
    console.error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
    throw new Error("Resend no aceptó el correo.");
  }
}
