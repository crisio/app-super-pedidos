// Detalle del pedido en iOS: secciones agrupadas, el siguiente paso como botón principal,
// y llamar, WhatsApp o cancelar desde el menú de la barra de título.
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import {
  canales,
  entregas,
  estados,
  formatearLempiras,
  formatearTelefono,
  normalizarTelefono,
  pagos,
  siguienteEstado,
  textoAccion,
  type DetallePedido,
} from "@super-pedidos/compartido";
import { Aviso, Boton, Cargando, InsigniaEstado, Pantalla } from "@/components/ios/controles";
import { Fila, INSET_CON_ICONO, Seccion } from "@/components/ios/lista";
import { iconoCanal } from "@/components/ios/pedidos";
import { color, colorEstado, MARGEN, texto } from "@/components/ios/sistema";
import { mensajeDeError } from "@/lib/api";
import { useCambiarEstado, usePedido } from "@/lib/consultas";
import { fechaHora, haceCuanto, useAhora } from "@/lib/tiempo";

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
  const cambiar = useCambiarEstado(id);
  const ahora = useAhora();

  if (pedido.isPending) {
    return (
      <Pantalla>
        <Cargando />
      </Pantalla>
    );
  }
  if (!pedido.data) {
    return (
      <Pantalla>
        <Aviso mensaje={mensajeDeError(pedido.error)} />
      </Pantalla>
    );
  }

  const p = pedido.data;
  const siguiente = siguienteEstado(p.estado, p.entrega);
  const canal = iconoCanal[p.canal];

  const llamar = () => Linking.openURL(`tel:${normalizarTelefono(p.clienteTelefono)}`);
  const escribir = () => Linking.openURL(enlaceWhatsApp(p));

  function avanzar() {
    if (!siguiente) return;
    cambiar.mutate(
      { estado: siguiente },
      { onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) },
    );
  }

  // Alerta del sistema con campo de texto para el motivo.
  function cancelar() {
    Alert.prompt(
      `¿Cancelar el pedido #${p.numero}?`,
      "Escribe el motivo. El cliente no recibe aviso automático.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar pedido",
          style: "destructive",
          onPress: (motivo?: string) => {
            const nota = (motivo ?? "").trim();
            if (nota.length < 3) {
              Alert.alert("Falta el motivo", "Escribe por qué se cancela el pedido.");
              return;
            }
            cambiar.mutate({ estado: "cancelado", nota });
          },
        },
      ],
      "plain-text",
      "",
      "default",
    );
  }

  return (
    <>
      <Stack.Title>{`Pedido #${p.numero}`}</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Más acciones">
          <Stack.Toolbar.MenuAction icon="phone" onPress={llamar}>
            Llamar a {p.clienteNombre}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="message" onPress={escribir}>
            Escribir por WhatsApp
          </Stack.Toolbar.MenuAction>
          {siguiente ? (
            <Stack.Toolbar.MenuAction icon="xmark.circle" destructive onPress={cancelar}>
              Cancelar pedido
            </Stack.Toolbar.MenuAction>
          ) : null}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <Pantalla refrescando={pedido.isRefetching} onRefrescar={() => pedido.refetch()}>
        <View style={estilos.cabecera}>
          <InsigniaEstado estado={p.estado} grande />
          <Text style={[texto.tituloGrande, { color: color.texto, fontVariant: ["tabular-nums"] }]}>
            {formatearLempiras(p.totalCentavos)}
          </Text>
          <Text style={[texto.subtitulo, { color: color.secundario }]}>
            {canales[p.canal]} · {p.localNombre} · llegó {haceCuanto(p.creadoEn, ahora)}
          </Text>
        </View>

        {siguiente ? (
          <View style={estilos.acciones}>
            <Boton
              titulo={textoAccion(siguiente, p.entrega)}
              cargando={cambiar.isPending}
              onPress={avanzar}
            />
          </View>
        ) : (
          <Seccion>
            <Fila
              icono={p.estado === "entregado" ? "checkmark.seal.fill" : "xmark.octagon.fill"}
              colorIcono={colorEstado[p.estado]}
              titulo={`Pedido ${estados[p.estado].toLowerCase()}`}
              subtitulo={p.eventos.at(-1)?.nota || null}
            />
          </Seccion>
        )}
        {cambiar.isError ? <Aviso mensaje={mensajeDeError(cambiar.error)} /> : null}

        <Seccion titulo="Cliente" insetSeparador={INSET_CON_ICONO}>
          <Fila icono="person.fill" colorIcono={color.gris} titulo={p.clienteNombre} />
          <Fila
            icono="phone.fill"
            colorIcono={color.azul}
            titulo={formatearTelefono(p.clienteTelefono)}
            subtitulo="Llamar"
            flecha
            onPress={llamar}
          />
          <Fila
            icono="message.fill"
            colorIcono="#25D366"
            titulo="WhatsApp"
            subtitulo="Avisarle cómo va su pedido"
            flecha
            onPress={escribir}
          />
        </Seccion>

        <Seccion titulo="Entrega" insetSeparador={INSET_CON_ICONO}>
          <Fila
            icono={
              p.entrega === "domicilio" ? "house.fill" : p.entrega === "recoger" ? "bag.fill" : "bicycle"
            }
            colorIcono={color.indigo}
            titulo={entregas[p.entrega]}
            subtitulo={p.direccion || (p.deliveryNombre ? `Recoge: ${p.deliveryNombre}` : null)}
          />
          <Fila icono="creditcard.fill" colorIcono={color.verde} titulo="Pago" valor={pagos[p.pago]} />
          <Fila icono={canal.simbolo} colorIcono={canal.color} titulo="Llegó por" valor={canales[p.canal]} />
          {p.notas ? (
            <Fila icono="note.text" colorIcono={color.amarillo} titulo={p.notas} lineasTitulo={6} />
          ) : null}
        </Seccion>

        <Seccion titulo={`Productos · ${p.unidades}`}>
          {p.lineas.map((linea) => (
            <Fila
              key={linea.productoId}
              izquierda={
                <View style={estilos.cantidad}>
                  <Text style={[texto.subtitulo, estilos.cantidadTexto]}>{linea.cantidad}</Text>
                </View>
              }
              titulo={linea.nombre}
              subtitulo={`${linea.unidad} · ${formatearLempiras(linea.precioCentavos)} c/u`}
              valor={formatearLempiras(linea.importeCentavos)}
            />
          ))}
        </Seccion>

        <Seccion>
          <Fila titulo="Subtotal" valor={formatearLempiras(p.subtotalCentavos)} />
          {p.entrega === "domicilio" ? (
            <Fila
              titulo="Envío"
              valor={p.envioCentavos === 0 ? "Gratis" : formatearLempiras(p.envioCentavos)}
            />
          ) : null}
          {p.tarifaServicioCentavos > 0 ? (
            <Fila titulo="Tarifa del delivery" valor={formatearLempiras(p.tarifaServicioCentavos)} />
          ) : null}
          <Fila
            titulo="Total"
            accesorio={
              <Text style={[texto.encabezado, { color: color.texto }]}>
                {formatearLempiras(p.totalCentavos)}
              </Text>
            }
          />
        </Seccion>

        <Seccion titulo="Historial" insetSeparador={INSET_CON_ICONO}>
          {p.eventos.map((evento, indice) => (
            <Fila
              key={indice}
              izquierda={
                <View style={estilos.puntoHistorial}>
                  <View style={[estilos.punto, { backgroundColor: colorEstado[evento.estado] }]} />
                </View>
              }
              titulo={estados[evento.estado]}
              subtitulo={[fechaHora(evento.creadoEn), evento.usuarioNombre, evento.nota]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </Seccion>
      </Pantalla>
    </>
  );
}

const estilos = StyleSheet.create({
  cabecera: { gap: 6, marginHorizontal: MARGEN + 4, alignItems: "flex-start" },
  acciones: { marginHorizontal: MARGEN, marginTop: -8 },
  cantidad: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: color.relleno,
    alignItems: "center",
    justifyContent: "center",
  },
  cantidadTexto: { color: color.texto, fontWeight: "700", fontVariant: ["tabular-nums"] },
  puntoHistorial: { width: 30, alignItems: "center" },
  punto: { width: 10, height: 10, borderRadius: 5 },
});
