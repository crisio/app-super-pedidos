// Contraseñas con PBKDF2 (WebCrypto), disponible tanto en Workers como en Node.
// 100,000 iteraciones es el máximo que permite Cloudflare Workers.

const ITERACIONES = 100_000;

function aBase64(bytes: Uint8Array) {
  let texto = "";
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto);
}

function deBase64(texto: string) {
  return Uint8Array.from(atob(texto), (caracter) => caracter.charCodeAt(0));
}

async function derivar(clave: string, sal: Uint8Array, iteraciones: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashearClave(clave: string) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(clave, sal, ITERACIONES);
  return `pbkdf2-sha256$${ITERACIONES}$${aBase64(sal)}$${aBase64(hash)}`;
}

export async function verificarClave(clave: string, guardado: string) {
  const [algoritmo, iteraciones, sal, esperado] = guardado.split("$");
  if (algoritmo !== "pbkdf2-sha256" || !iteraciones || !sal || !esperado) return false;
  const calculado = await derivar(clave, deBase64(sal), Number(iteraciones));
  const bytesEsperados = deBase64(esperado);
  if (calculado.length !== bytesEsperados.length) return false;
  // Comparación en tiempo constante.
  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) diferencia |= calculado[i] ^ bytesEsperados[i];
  return diferencia === 0;
}

export function generarToken() {
  return aBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function hashearToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return aBase64(new Uint8Array(digest));
}
