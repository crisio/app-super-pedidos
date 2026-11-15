// Controles nativos de iOS: botones de SwiftUI, íconos SF Symbols, estados y avisos.
import { Button, Host, Picker, Stepper, Text as TextoSwiftUI } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  controlSize,
  disabled,
  font,
  frame,
  labelsHidden,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { SymbolView, type SymbolWeight } from "expo-symbols";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  DynamicColorIOS,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { estados, type Estado } from "@super-pedidos/compartido";
import { color, MARGEN, RADIO_SECCION, texto, VERSION_IOS } from "./sistema";

export function Simbolo({
  nombre,
  tamano = 17,
  color: tinte = color.tinte,
  peso = "regular",
  style,
}: {
  nombre: SFSymbol;
  tamano?: number;
  color?: ColorValue;
  peso?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}) {
  return <SymbolView name={nombre} size={tamano} tintColor={tinte} weight={peso} style={style} />;
}

// Botón de SwiftUI: con Liquid Glass en iOS 26 y relleno de color en versiones anteriores.
export function Boton({
  titulo,
  onPress,
  variante = "principal",
  cargando = false,
  deshabilitado = false,
  ancho = "completo",
}: {
  titulo: string;
  onPress: () => void;
  variante?: "principal" | "secundario" | "peligro";
  cargando?: boolean;
  deshabilitado?: boolean;
  ancho?: "completo" | "ajustado";
}) {
  const conVidrio = VERSION_IOS >= 26;
  const estilo =
    variante === "secundario"
      ? conVidrio
        ? "glass"
        : "bordered"
      : conVidrio
        ? "glassProminent"
        : "borderedProminent";
  const completo = ancho === "completo";
  return (
    <Host
      matchContents={completo ? { vertical: true } : true}
      style={completo ? estilos.botonCompleto : undefined}
    >
      <Button
        onPress={onPress}
        role={variante === "peligro" ? "destructive" : "default"}
        modifiers={[
          buttonStyle(estilo),
          controlSize("large"),
          tint(variante === "peligro" ? "#FF3B30" : color.tinte),
          disabled(deshabilitado || cargando),
        ]}
      >
        <TextoSwiftUI
          modifiers={[...(completo ? [frame({ maxWidth: Infinity })] : []), font({ weight: "semibold" })]}
        >
          {cargando ? "Un momento…" : titulo}
        </TextoSwiftUI>
      </Button>
    </Host>
  );
}

// Menú desplegable de SwiftUI con la opción elegida y las flechas ⌃⌄, como en los formularios de iOS.
export function SelectorMenu<T extends string>({
  valor,
  opciones,
  onCambiar,
}: {
  valor: T;
  opciones: { valor: T; titulo: string }[];
  onCambiar: (valor: T) => void;
}) {
  return (
    <Host matchContents>
      <Picker<string>
        selection={valor}
        onSelectionChange={(elegido) => onCambiar(elegido as T)}
        modifiers={[pickerStyle("menu"), tint(color.tinte)]}
      >
        {opciones.map((opcion) => (
          <TextoSwiftUI key={opcion.valor} modifiers={[tag(opcion.valor)]}>
            {opcion.titulo}
          </TextoSwiftUI>
        ))}
      </Picker>
    </Host>
  );
}

// Botones − + del sistema para cambiar una cantidad.
export function Contador({
  valor,
  maximo,
  etiqueta,
  onCambiar,
}: {
  valor: number;
  maximo: number;
  etiqueta: string;
  onCambiar: (valor: number) => void;
}) {
  return (
    <Host matchContents>
      <Stepper
        label={etiqueta}
        value={valor}
        min={0}
        max={maximo}
        step={1}
        onValueChange={onCambiar}
        modifiers={[labelsHidden()]}
      />
    </Host>
  );
}

// Colores de cada estado: el del sistema y uno más oscuro para que el texto se lea en modo claro.
const paleta: Record<Estado, { claro: string; oscuro: string; textoClaro: string }> = {
  recibido: { claro: "#FF9500", oscuro: "#FF9F0A", textoClaro: "#C93400" },
  aceptado: { claro: "#007AFF", oscuro: "#0A84FF", textoClaro: "#0040DD" },
  preparando: { claro: "#AF52DE", oscuro: "#BF5AF2", textoClaro: "#8944AB" },
  listo: { claro: "#34C759", oscuro: "#30D158", textoClaro: "#248A3D" },
  en_camino: { claro: "#30B0C7", oscuro: "#40C8E0", textoClaro: "#0071A4" },
  entregado: { claro: "#8E8E93", oscuro: "#98989D", textoClaro: "#6C6C70" },
  cancelado: { claro: "#FF3B30", oscuro: "#FF453A", textoClaro: "#D70015" },
};

export function InsigniaEstado({ estado, grande = false }: { estado: Estado; grande?: boolean }) {
  const tonos = paleta[estado];
  return (
    <View
      style={[
        estilos.insignia,
        grande && estilos.insigniaGrande,
        { backgroundColor: DynamicColorIOS({ light: `${tonos.claro}1F`, dark: `${tonos.oscuro}33` }) },
      ]}
    >
      <View
        style={[
          estilos.punto,
          { backgroundColor: DynamicColorIOS({ light: tonos.claro, dark: tonos.oscuro }) },
        ]}
      />
      <Text
        style={[
          grande ? texto.subtitulo : texto.nota,
          { fontWeight: "600", color: DynamicColorIOS({ light: tonos.textoClaro, dark: tonos.oscuro }) },
        ]}
      >
        {estados[estado]}
      </Text>
    </View>
  );
}

export function Vacio({ icono, titulo, detalle }: { icono: SFSymbol; titulo: string; detalle?: string }) {
  return (
    <View style={estilos.vacio}>
      <Simbolo nombre={icono} tamano={44} color={color.secundario} />
      <Text style={[texto.titulo3, estilos.vacioTitulo]}>{titulo}</Text>
      {detalle ? <Text style={[texto.subtitulo, estilos.vacioDetalle]}>{detalle}</Text> : null}
    </View>
  );
}

export function Cargando() {
  return (
    <View style={estilos.cargando}>
      <ActivityIndicator />
    </View>
  );
}

export function Aviso({ mensaje, tono = "error" }: { mensaje: string; tono?: "error" | "info" }) {
  return (
    <View style={estilos.aviso}>
      <Simbolo
        nombre={tono === "error" ? "exclamationmark.triangle.fill" : "info.circle.fill"}
        tamano={18}
        color={tono === "error" ? color.naranja : color.azul}
      />
      <Text style={[texto.subtitulo, estilos.avisoTexto]}>{mensaje}</Text>
    </View>
  );
}

// Contenedor de cada pantalla: el fondo agrupado de iOS y el desplazamiento que encoge el
// título grande. Tiene que ser lo primero de la pantalla para que la barra lo siga.
export function Pantalla({
  children,
  refrescando,
  onRefrescar,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode; refrescando?: boolean; onRefrescar?: () => void }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, contentContainerStyle]}
      refreshControl={
        onRefrescar ? <RefreshControl refreshing={refrescando ?? false} onRefresh={onRefrescar} /> : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  botonCompleto: { alignSelf: "stretch" },
  insignia: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  insigniaGrande: { paddingHorizontal: 10, paddingVertical: 5 },
  punto: { width: 7, height: 7, borderRadius: 4 },
  vacio: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48, gap: 8 },
  vacioTitulo: { color: color.texto, textAlign: "center", marginTop: 8 },
  vacioDetalle: { color: color.secundario, textAlign: "center" },
  cargando: { paddingVertical: 48, alignItems: "center" },
  aviso: {
    marginHorizontal: MARGEN,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: RADIO_SECCION,
    borderCurve: "continuous",
    backgroundColor: color.celda,
  },
  avisoTexto: { flex: 1, color: color.texto },
  pantalla: { flex: 1, backgroundColor: color.fondo },
  contenido: { paddingTop: 8, paddingBottom: 40, gap: 28 },
});
