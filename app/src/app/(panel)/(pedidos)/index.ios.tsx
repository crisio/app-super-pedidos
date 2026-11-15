// Bandeja de pedidos en iOS: resumen como las listas de Recordatorios, búsqueda en la barra
// de título y una sección por estado.
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type ColorValue } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  estados,
  estadosActivos,
  normalizarBusqueda,
  normalizarTelefono,
  type Estado,
  type ResumenPedido,
} from "@super-pedidos/compartido";
import { Aviso, Cargando, Pantalla, Simbolo, Vacio } from "@/components/ios/controles";
import { INSET_CON_ICONO, Seccion } from "@/components/ios/lista";
import { BarraPanel, FilaPedido } from "@/components/ios/pedidos";
import { color, MARGEN, texto, VERSION_IOS } from "@/components/ios/sistema";
import { mensajeDeError } from "@/lib/api";
import { useLocales, usePedidos, type Vista } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { useAhora } from "@/lib/tiempo";

// Tarjetas del resumen: cada una agrupa uno o dos estados.
type Grupo = "nuevos" | "preparacion" | "listos" | "camino";
const grupos: { clave: Grupo; titulo: string; estados: Estado[]; icono: SFSymbol; color: ColorValue }[] = [
  { clave: "nuevos", titulo: "Nuevos", estados: ["recibido"], icono: "bell.fill", color: color.naranja },
  {
    clave: "preparacion",
    titulo: "Preparando",
    estados: ["aceptado", "preparando"],
    icono: "basket.fill",
    color: color.morado,
  },
  { clave: "listos", titulo: "Listos", estados: ["listo"], icono: "checkmark", color: color.verde },
  { clave: "camino", titulo: "En camino", estados: ["en_camino"], icono: "car.fill", color: color.turquesa },
];

function coincide(pedido: ResumenPedido, busqueda: string) {
  if (!busqueda) return true;
  const numero = busqueda.replace(/^#/, "");
  if (/^\d+$/.test(numero)) {
    return String(pedido.numero) === numero || normalizarTelefono(pedido.clienteTelefono).includes(numero);
  }
  return normalizarBusqueda(pedido.clienteNombre).includes(busqueda);
}

export default function Bandeja() {
  const usuario = useUsuario();
  const router = useRouter();
  const esCentral = usuario.rol === "central";
  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const localId = esCentral ? localElegido : usuario.localId;
  const [vista, setVista] = useState<Vista>("activos");
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const ahora = useAhora();

  const locales = useLocales();
  const pedidos = usePedidos(vista, localId);
  const lista = pedidos.data ?? [];
  const buscado = normalizarBusqueda(busqueda);
  const visibles = lista.filter((pedido) => coincide(pedido, buscado));
  const mostrarLocal = esCentral && localId === null;
  const nombreLocal = locales.data?.find((local) => local.id === localId)?.nombre;

  const abrir = (pedido: ResumenPedido) => router.push(`/pedido/${pedido.id}`);
  const elegirGrupo = (clave: Grupo) => {
    Haptics.selectionAsync();
    setGrupo(grupo === clave ? null : clave);
  };

  const filtroGrupo = grupos.find((item) => item.clave === grupo);
  const enGrupo = filtroGrupo
    ? visibles.filter((pedido) => filtroGrupo.estados.includes(pedido.estado))
    : visibles;

  return (
    <>
      <Stack.SearchBar
        placeholder="Cliente, teléfono o número"
        onChangeText={(evento) => setBusqueda(evento.nativeEvent.text)}
        onCancelButtonPress={() => setBusqueda("")}
        autoCapitalize="none"
      />
      <BarraPanel locales={locales.data} localId={localId} onCambiarLocal={setLocalElegido} />
      <Pantalla refrescando={pedidos.isRefetching} onRefrescar={() => pedidos.refetch()}>
        <View style={estilos.cabecera}>
          {nombreLocal || !esCentral ? (
            <Text style={[texto.subtitulo, { color: color.secundario }]}>
              {nombreLocal ?? "Tu local"} · se actualiza cada 10 s
            </Text>
          ) : (
            <Text style={[texto.subtitulo, { color: color.secundario }]}>
              Todos los locales · se actualiza cada 10 s
            </Text>
          )}
          <SegmentedControl
            values={["En curso", "Cerrados"]}
            selectedIndex={vista === "activos" ? 0 : 1}
            onChange={(evento) => {
              setVista(evento.nativeEvent.selectedSegmentIndex === 0 ? "activos" : "cerrados");
              setGrupo(null);
            }}
          />
        </View>

        {vista === "activos" && pedidos.data ? (
          <View style={estilos.tarjetas}>
            {grupos.map((item) => (
              <Tarjeta
                key={item.clave}
                titulo={item.titulo}
                icono={item.icono}
                tono={item.color}
                cuenta={visibles.filter((pedido) => item.estados.includes(pedido.estado)).length}
                elegida={grupo === item.clave}
                onPress={() => elegirGrupo(item.clave)}
              />
            ))}
          </View>
        ) : null}

        {pedidos.isPending ? (
          <Cargando />
        ) : pedidos.isError && !pedidos.data ? (
          <Aviso mensaje={mensajeDeError(pedidos.error)} />
        ) : lista.length === 0 ? (
          <Vacio
            icono="tray"
            titulo={vista === "activos" ? "No hay pedidos en curso" : "Todavía no hay pedidos cerrados"}
            detalle={
              vista === "activos"
                ? "Los pedidos nuevos aparecen aquí. Para uno de WhatsApp o por teléfono, usa Nuevo pedido."
                : undefined
            }
          />
        ) : enGrupo.length === 0 ? (
          <Vacio
            icono="magnifyingglass"
            titulo={buscado ? "Sin resultados" : `No hay pedidos ${filtroGrupo?.titulo.toLowerCase() ?? ""}`}
            detalle={buscado ? `Ningún pedido coincide con “${busqueda.trim()}”.` : undefined}
          />
        ) : vista === "cerrados" ? (
          <Seccion titulo="Entregados y cancelados" insetSeparador={INSET_CON_ICONO}>
            {enGrupo.map((pedido) => (
              <FilaPedido
                key={pedido.id}
                pedido={pedido}
                ahora={ahora}
                mostrarLocal={mostrarLocal}
                mostrarEstado
                onPress={() => abrir(pedido)}
              />
            ))}
          </Seccion>
        ) : (
          estadosActivos.map((estado) => {
            const delEstado = enGrupo.filter((pedido) => pedido.estado === estado);
            if (delEstado.length === 0) return null;
            return (
              <Seccion
                key={estado}
                titulo={`${estados[estado]} · ${delEstado.length}`}
                insetSeparador={INSET_CON_ICONO}
              >
                {delEstado.map((pedido) => (
                  <FilaPedido
                    key={pedido.id}
                    pedido={pedido}
                    ahora={ahora}
                    mostrarLocal={mostrarLocal}
                    onPress={() => abrir(pedido)}
                  />
                ))}
              </Seccion>
            );
          })
        )}

        {pedidos.isError && pedidos.data ? <Aviso mensaje="No se pudo actualizar. Reintentando…" /> : null}
      </Pantalla>
    </>
  );
}

// Tarjeta de resumen, como las listas inteligentes de Recordatorios. Tocarla filtra la bandeja.
function Tarjeta({
  titulo,
  icono,
  tono,
  cuenta,
  elegida,
  onPress,
}: {
  titulo: string;
  icono: SFSymbol;
  tono: ColorValue;
  cuenta: number;
  elegida: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={`${titulo}: ${cuenta}`}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: elegida ? tono : color.celda },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={estilos.tarjetaArriba}>
        <View style={[estilos.circulo, { backgroundColor: elegida ? "#FFFFFF" : tono }]}>
          <Simbolo nombre={icono} tamano={16} peso="semibold" color={elegida ? tono : "#FFFFFF"} />
        </View>
        <Text
          style={[texto.titulo1, { color: elegida ? "#FFFFFF" : color.texto, fontVariant: ["tabular-nums"] }]}
        >
          {cuenta}
        </Text>
      </View>
      <Text
        style={[texto.subtitulo, estilos.tarjetaTitulo, { color: elegida ? "#FFFFFF" : color.secundario }]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { gap: 12, marginHorizontal: MARGEN },
  tarjetas: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginHorizontal: MARGEN, marginTop: -8 },
  tarjeta: {
    flexBasis: "45%",
    flexGrow: 1,
    padding: 12,
    gap: 6,
    borderRadius: VERSION_IOS >= 26 ? 22 : 12,
    borderCurve: "continuous",
  },
  tarjetaArriba: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  circulo: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tarjetaTitulo: { fontWeight: "600" },
});
