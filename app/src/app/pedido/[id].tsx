import { Stack, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
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
import {
  Bike,
  Clock,
  History,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  StickyNote,
  Store,
  User,
  X,
} from "@/components/iconos";
import { InsigniaCanal, InsigniaEstado, tonoEstado } from "@/components/insignias";
import {
  Boton,
  Campo,
  Cargando,
  Fila,
  MensajeError,
  Pantalla,
  Separador,
  Tarjeta,
  tonos,
} from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useCambiarEstado, usePedido } from "@/lib/consultas";
import { fechaHora, haceCuanto, useAhora } from "@/lib/tiempo";
import { colores } from "@/tema";

function enlaceWhatsApp(pedido: DetallePedido) {
  const mensaje =
    `Hola ${pedido.clienteNombre}, le saludamos de ${pedido.localNombre}. ` +
    `Su pedido #${pedido.numero} está: ${estados[pedido.estado]}. ` +
    `Total: ${formatearLempiras(pedido.totalCentavos)}.`;
  return `https://wa.me/504${normalizarTelefono(pedido.clienteTelefono)}?text=${encodeURIComponent(mensaje)}`;
}

function TituloSeccion({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <View className="flex-row items-center gap-2">
      {icono}
      <Text className="text-base font-semibold text-white">{texto}</Text>
    </View>
  );
}

export default function DetalleDePedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedido = usePedido(id);
  const ahora = useAhora();

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
      <View className="flex-row flex-wrap gap-4">
        <View className="gap-4" style={{ flexGrow: 2, flexBasis: 420 }}>
          <Tarjeta brillo>
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="mr-1 text-3xl font-bold tracking-tight text-white">#{p.numero}</Text>
              <InsigniaEstado estado={p.estado} />
              <InsigniaCanal canal={p.canal} />
            </View>
            <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
              <View className="flex-row items-center gap-1.5">
                <Store size={14} color={colores.apagado} />
                <Text className="text-sm text-zinc-400">{p.localNombre}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color={colores.apagado} />
                <Text className="text-sm text-zinc-400">
                  Llegó {haceCuanto(p.creadoEn, ahora)} · {fechaHora(p.creadoEn)}
                </Text>
              </View>
            </View>
            <Acciones pedido={p} />
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion icono={<Package size={16} color={colores.marca} />} texto="Productos" />
            {p.lineas.map((linea) => (
              <View key={linea.productoId} className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Text className="text-sm font-bold text-white">{linea.cantidad}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-zinc-100">{linea.nombre}</Text>
                  <Text className="text-xs text-zinc-500">
                    {linea.unidad} · {formatearLempiras(linea.precioCentavos)} c/u
                  </Text>
                </View>
                <Text className="text-[15px] text-zinc-200">{formatearLempiras(linea.importeCentavos)}</Text>
              </View>
            ))}
            <Separador />
            <View className="gap-2">
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
              <Text className="text-xs text-zinc-500">Pago: {pagos[p.pago]}</Text>
            </View>
          </Tarjeta>
        </View>

        <View className="gap-4" style={{ flexGrow: 1, flexBasis: 300 }}>
          <Tarjeta>
            <TituloSeccion icono={<User size={16} color={colores.marca} />} texto="Cliente" />
            <View className="gap-0.5">
              <Text className="text-[15px] font-semibold text-white">{p.clienteNombre}</Text>
              <Text className="text-sm text-zinc-400">{p.clienteTelefono}</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Boton
                titulo="WhatsApp"
                variante="whatsapp"
                icono={<MessageCircle size={16} color="#86efac" />}
                onPress={() => Linking.openURL(enlaceWhatsApp(p))}
                className="grow"
              />
              <Boton
                titulo="Llamar"
                variante="secundario"
                icono={<Phone size={16} color={colores.texto} />}
                onPress={() => Linking.openURL(`tel:${normalizarTelefono(p.clienteTelefono)}`)}
                className="grow"
              />
            </View>
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion icono={<Bike size={16} color={colores.marca} />} texto="Entrega" />
            <Text className="text-[15px] font-medium text-zinc-100">{entregas[p.entrega]}</Text>
            {p.direccion ? (
              <View className="flex-row gap-2">
                <MapPin size={15} color={colores.apagado} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm leading-5 text-zinc-300">{p.direccion}</Text>
              </View>
            ) : null}
            {p.deliveryNombre ? (
              <Text className="text-sm text-zinc-300">Recoge: {p.deliveryNombre}</Text>
            ) : null}
            {p.notas ? (
              <View className="flex-row gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                <StickyNote size={15} color="#fcd34d" style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm leading-5 text-amber-100">{p.notas}</Text>
              </View>
            ) : null}
          </Tarjeta>

          <Tarjeta>
            <TituloSeccion icono={<History size={16} color={colores.marca} />} texto="Historial" />
            <View>
              {p.eventos.map((evento, indice) => {
                const ultimo = indice === p.eventos.length - 1;
                return (
                  <View key={indice} className="flex-row gap-3">
                    <View className="items-center">
                      <View
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${tonos[tonoEstado[evento.estado]].punto}`}
                      />
                      {ultimo ? null : <View className="w-px flex-1 bg-white/10" />}
                    </View>
                    <View className={`flex-1 gap-0.5 ${ultimo ? "" : "pb-4"}`}>
                      <Text className="text-sm font-semibold text-white">
                        {estados[evento.estado]}
                        <Text className="font-normal text-zinc-500"> · {fechaHora(evento.creadoEn)}</Text>
                      </Text>
                      <Text className="text-xs text-zinc-400">
                        {[evento.usuarioNombre, evento.nota].filter(Boolean).join(" — ")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Tarjeta>
        </View>
      </View>
    </Pantalla>
  );
}

function Acciones({ pedido }: { pedido: DetallePedido }) {
  const cambiar = useCambiarEstado(pedido.id);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const siguiente = siguienteEstado(pedido.estado, pedido.entrega);

  if (!siguiente) {
    return (
      <Text className="text-sm text-zinc-400">Este pedido está {estados[pedido.estado].toLowerCase()}.</Text>
    );
  }

  return (
    <View className="gap-3">
      {cancelando ? (
        <View className="gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <Campo
            etiqueta="Motivo de la cancelación"
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Por ejemplo: el cliente ya no lo quiere"
            autoFocus
          />
          <View className="flex-row flex-wrap gap-2">
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
        <View className="flex-row flex-wrap gap-2">
          <Boton
            titulo={textoAccion(siguiente, pedido.entrega)}
            cargando={cambiar.isPending}
            onPress={() => cambiar.mutate({ estado: siguiente })}
            className="grow"
          />
          <Boton
            titulo="Cancelar pedido"
            variante="peligro"
            icono={<X size={16} color="#fca5a5" />}
            onPress={() => setCancelando(true)}
          />
        </View>
      )}
      {cambiar.isError ? <MensajeError mensaje={mensajeDeError(cambiar.error)} /> : null}
    </View>
  );
}
