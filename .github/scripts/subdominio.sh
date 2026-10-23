#!/usr/bin/env bash
# Crea o actualiza en Cloudflare el subdominio de la app web, apuntando a GitHub Pages.
#
#   subdominio.sh <zona> <subdominio completo> <destino>
#   subdominio.sh christopherpineda.com supercoquin.christopherpineda.com crisio.github.io
#
# Necesita CLOUDFLARE_API_TOKEN con permisos "Zone: Read" y "DNS: Edit" sobre la zona.
set -euo pipefail

ZONA="$1"
NOMBRE="$2"
DESTINO="$3"
API="https://api.cloudflare.com/client/v4"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "::error::Falta el secret CLOUDFLARE_API_TOKEN (Settings → Secrets and variables → Actions)." >&2
  exit 1
fi

# Llama a la API de Cloudflare; si falla, muestra el motivo que da Cloudflare.
cf() {
  local respuesta
  if ! respuesta=$(curl -sS --fail-with-body \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"); then
    local motivo
    motivo=$(jq -r '[.errors[]?.message] | join("; ")' <<<"$respuesta" 2>/dev/null || true)
    echo "::error::Cloudflare rechazó la solicitud: ${motivo:-$respuesta}" >&2
    return 1
  fi
  printf '%s' "$respuesta"
}

ZONA_JSON=$(cf "$API/zones?name=$ZONA")
ZONA_ID=$(jq -r '.result[0].id // empty' <<<"$ZONA_JSON")
if [ -z "$ZONA_ID" ]; then
  echo "::error::No encontré $ZONA en esta cuenta de Cloudflare. Si el dominio usa los servidores de nombres de otro proveedor (por ejemplo WordPress.com), agrégalo en Cloudflare (Add a site) y cambia sus servidores de nombres a los que te indique Cloudflare." >&2
  exit 1
fi

# Una zona "pending" existe en Cloudflare, pero el dominio todavía usa otros servidores de nombres.
ESTADO=$(jq -r '.result[0].status' <<<"$ZONA_JSON")
if [ "$ESTADO" != "active" ]; then
  SERVIDORES=$(jq -r '.result[0].name_servers // [] | join(", ")' <<<"$ZONA_JSON")
  echo "::warning::$ZONA está en Cloudflare pero no está activa (estado: $ESTADO). El subdominio no funcionará hasta que cambies los servidores de nombres del dominio a: $SERVIDORES"
fi

REGISTRO=$(cf "$API/zones/$ZONA_ID/dns_records?name=$NOMBRE")
ID=$(jq -r '.result[0].id // empty' <<<"$REGISTRO")
TIPO=$(jq -r '.result[0].type // empty' <<<"$REGISTRO")
ACTUAL=$(jq -r '.result[0].content // empty' <<<"$REGISTRO")
# Sin "// empty": jq lo aplicaría también al valor false.
CON_PROXY=$(jq -r '.result[0].proxied' <<<"$REGISTRO")

# Sin el proxy de Cloudflare: GitHub Pages necesita ver el CNAME para emitir el certificado HTTPS.
DATOS=$(jq -n --arg nombre "$NOMBRE" --arg destino "$DESTINO" \
  '{type: "CNAME", name: $nombre, content: $destino, proxied: false, ttl: 1, comment: "App web de Super Pedidos (GitHub Pages)"}')

if [ -z "$ID" ]; then
  cf -X POST "$API/zones/$ZONA_ID/dns_records" --data "$DATOS" >/dev/null
  echo "Subdominio $NOMBRE creado: apunta a $DESTINO"
elif [ "$TIPO" = "CNAME" ] && [ "$ACTUAL" = "$DESTINO" ] && [ "$CON_PROXY" = "false" ]; then
  echo "Subdominio $NOMBRE ya apunta a $DESTINO"
else
  cf -X PUT "$API/zones/$ZONA_ID/dns_records/$ID" --data "$DATOS" >/dev/null
  echo "Subdominio $NOMBRE actualizado: ahora apunta a $DESTINO"
fi
