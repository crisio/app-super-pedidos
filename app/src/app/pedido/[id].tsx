import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import {
  entregas,
  estados,
  formatearLempiras,
  normalizarTelefono,
  pagos,
  siguienteEstado,
  textoAccion,
  type DetallePedido,
} from "@super-pedidos/compartido";
import { InsigniaCanal, InsigniaEstado } from "@/components/insignias";
import { Boton, Campo, Cargando, Fila, MensajeError, Pantalla, Tarjeta, Texto } from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useCambiarEstado, usePedido } from "@/lib/consultas";
import { fechaHora, haceCuanto, useAhora } from "@/lib/tiempo";
import { useTema } from "@/tema";

function enlaceWhatsApp(pedido: DetallePedido) {
  const mensaje =
    `Hola ${pedido.clienteNombre}, le saludamos de ${pedido.localNombre}. ` +
    `Su pedido #${pedido.numero} está: ${estados[pedido.estado]}. ` +
    `Total: ${formatearLempiras(pedido.totalCentavos)}.`;
  return `https://wa.me/504${normalizarTelefono(pedido.clienteTelefono)}?text=${encodeURIComponent(mensaje)}`;
}

export default function DetalleDePedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedido = usePedido(id);
  const ahora = useAhora();
  const t = useTema();

  if (pedido.isPending) return <Cargando />;
  if (!pedido.data) {
    return (
      <Pantalla>
        <MensajeError mensaje={mensajeDeError(pedido.error)} />
      </Pantalla>
    );
  }

  const p = pedido.data;
  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Pedido #${p.numero}` }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <View style={{ flexGrow: 2, flexBasis: 420, gap: 16 }}>
          <Tarjeta>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Texto variante="titulo">#{p.numero}</Texto>
              <InsigniaEstado estado={p.estado} />
              <InsigniaCanal canal={p.canal} />
            </View>
            <Texto variante="tenue">
              {p.localNombre} · llegó {haceCuanto(p.creadoEn, ahora)} ({fechaHora(p.creadoEn)})
            </Texto>
            <Acciones pedido={p} />
          </Tarjeta>

          <Tarjeta>
            <Texto variante="subtitulo">Productos</Texto>
            {p.lineas.map((linea) => (
              <View
                key={linea.productoId}
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Texto variante="fuerte">
                    {linea.cantidad} × {linea.nombre}
                  </Texto>
                  <Texto variante="pequeno">
                    {linea.unidad} · {formatearLempiras(linea.precioCentavos)}
                  </Texto>
                </View>
                <Texto>{formatearLempiras(linea.importeCentavos)}</Texto>
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderColor: t.borde, gap: 6, paddingTop: 12 }}>
              <Fila etiqueta="Subtotal" valor={formatearLempiras(p.subtotalCentavos)} />
              {p.entrega === "domicilio" && (
                <Fila
                  etiqueta="Envío"
                  valor={p.envioCentavos === 0 ? "Gratis" : formatearLempiras(p.envioCentavos)}
                />
              )}
              {p.tarifaServicioCentavos > 0 && (
                <Fila
                  etiqueta="Tarifa de servicio (delivery)"
                  valor={formatearLempiras(p.tarifaServicioCentavos)}
                />
              )}
              <Fila etiqueta="Total" valor={formatearLempiras(p.totalCentavos)} fuerte />
              <Texto variante="pequeno">Pago: {pagos[p.pago]}</Texto>
            </View>
          </Tarjeta>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 300, gap: 16 }}>
          <Tarjeta>
            <Texto variante="subtitulo">Cliente</Texto>
            <Texto variante="fuerte">{p.clienteNombre}</Texto>
            <Texto variante="tenue">{p.clienteTelefono}</Texto>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Boton
                titulo="Escribir por WhatsApp"
                variante="secundario"
                onPress={() => Linking.openURL(enlaceWhatsApp(p))}
              />
              <Boton
                titulo="Llamar"
                variante="secundario"
                onPress={() => Linking.openURL(`tel:${normalizarTelefono(p.clienteTelefono)}`)}
              />
            </View>
          </Tarjeta>

          <Tarjeta>
            <Texto variante="subtitulo">Entrega</Texto>
            <Texto variante="fuerte">{entregas[p.entrega]}</Texto>
            {p.direccion ? <Texto>{p.direccion}</Texto> : null}
            {p.deliveryNombre ? <Texto>Recoge: {p.deliveryNombre}</Texto> : null}
            {p.notas ? (
              <View style={{ gap: 4 }}>
                <Texto variante="fuerte">Notas</Texto>
                <Texto>{p.notas}</Texto>
              </View>
            ) : null}
          </Tarjeta>

          <Tarjeta>
            <Texto variante="subtitulo">Historial</Texto>
            {p.eventos.map((evento, indice) => (
              <View key={indice} style={{ gap: 2 }}>
                <Texto variante="fuerte">
                  {estados[evento.estado]} · {fechaHora(evento.creadoEn)}
                </Texto>
                <Texto variante="pequeno">
                  {[evento.usuarioNombre, evento.nota].filter(Boolean).join(" — ")}
                </Texto>
              </View>
            ))}
          </Tarjeta>
        </View>
      </View>
    </Pantalla>
  );
}

function Acciones({ pedido }: { pedido: DetallePedido }) {
  const t = useTema();
  const cambiar = useCambiarEstado(pedido.id);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const siguiente = siguienteEstado(pedido.estado, pedido.entrega);

  if (!siguiente) {
    return <Texto variante="tenue">Este pedido está {estados[pedido.estado].toLowerCase()}.</Texto>;
  }

  return (
    <View style={{ gap: 10 }}>
      {cancelando ? (
        <View style={{ gap: 10, padding: 12, borderRadius: 12, backgroundColor: t.peligroSuave }}>
          <Campo
            etiqueta="Motivo de la cancelación"
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Por ejemplo: el cliente ya no lo quiere"
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Boton
              titulo="Confirmar cancelación"
              variante="peligro"
              deshabilitado={motivo.trim().length < 3}
              cargando={cambiar.isPending}
              onPress={() =>
                cambiar.mutate(
                  { estado: "cancelado", nota: motivo.trim() },
                  { onSuccess: () => setCancelando(false) },
                )
              }
            />
            <Boton titulo="Volver" variante="secundario" onPress={() => setCancelando(false)} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Boton
            titulo={textoAccion(siguiente, pedido.entrega)}
            cargando={cambiar.isPending}
            onPress={() => cambiar.mutate({ estado: siguiente })}
            style={{ flexGrow: 1 }}
          />
          <Boton titulo="Cancelar pedido" variante="peligro" onPress={() => setCancelando(true)} />
        </View>
      )}
      {cambiar.isError ? <MensajeError mensaje={mensajeDeError(cambiar.error)} /> : null}
    </View>
  );
}
