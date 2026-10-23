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

cf() {
  curl -sS --fail-with-body \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

ZONA_ID=$(cf "$API/zones?name=$ZONA" | jq -r '.result[0].id // empty')
if [ -z "$ZONA_ID" ]; then
  echo "::error::No encontré $ZONA en Cloudflare. Revisa que el dominio esté en esta cuenta y que el token tenga permiso Zone: Read."
  exit 1
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
