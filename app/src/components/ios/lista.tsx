// Listas agrupadas como las de Ajustes de iOS: secciones con esquinas redondeadas,
// filas de 44 puntos, separadores finos y flecha a la derecha cuando la fila abre algo.
import { Children, Fragment, isValidElement, type ComponentRef, type ReactNode, type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { Simbolo } from "./controles";
import { color, MARGEN, RADIO_SECCION, texto } from "./sistema";

const LADO_ICONO = 30;

export function Seccion({
  titulo,
  pie,
  children,
  insetSeparador = MARGEN,
  style,
}: {
  titulo?: string;
  pie?: string;
  children?: ReactNode;
  // Dónde empieza la línea entre filas: más adentro si las filas tienen ícono.
  insetSeparador?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const filas = Children.toArray(children);
  return (
    <View style={[estilos.seccion, style]}>
      {titulo ? <Text style={estilos.tituloSeccion}>{titulo}</Text> : null}
      {filas.length > 0 ? (
        <View style={estilos.caja}>
          {filas.map((fila, indice) => (
            <Fragment key={isValidElement(fila) && fila.key != null ? fila.key : indice}>
              {indice > 0 ? <View style={[estilos.separador, { marginLeft: insetSeparador }]} /> : null}
              {fila}
            </Fragment>
          ))}
        </View>
      ) : null}
      {pie ? <Text style={estilos.pie}>{pie}</Text> : null}
    </View>
  );
}

// Inset del separador para filas con ícono.
export const INSET_CON_ICONO = MARGEN + LADO_ICONO + 12;

export function Fila({
  titulo,
  subtitulo,
  valor,
  icono,
  colorIcono = color.tinte,
  iconoSinFondo = false,
  izquierda,
  accesorio,
  flecha = false,
  tono = "normal",
  lineasTitulo = 2,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  titulo: string;
  subtitulo?: string | null;
  valor?: string | null;
  icono?: SFSymbol;
  colorIcono?: ColorValue;
  // Ícono de color sobre la fila en vez de dentro de un cuadro de color (como en Ajustes).
  iconoSinFondo?: boolean;
  // Contenido propio a la izquierda (en lugar del ícono).
  izquierda?: ReactNode;
  accesorio?: ReactNode;
  flecha?: boolean;
  tono?: "normal" | "tinte" | "peligro" | "apagado";
  lineasTitulo?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}) {
  const colorTitulo =
    tono === "tinte"
      ? color.tinte
      : tono === "peligro"
        ? color.rojo
        : tono === "apagado"
          ? color.secundario
          : color.texto;

  const contenido = (
    <>
      {izquierda ??
        (icono ? (
          iconoSinFondo ? (
            <View style={estilos.icono}>
              <Simbolo nombre={icono} tamano={22} color={colorIcono} />
            </View>
          ) : (
            <View style={[estilos.icono, estilos.iconoConFondo, { backgroundColor: colorIcono }]}>
              <Simbolo nombre={icono} tamano={18} color="#FFFFFF" />
            </View>
          )
        ) : null)}
      <View style={estilos.textos}>
        <Text style={[texto.cuerpo, { color: colorTitulo }]} numberOfLines={lineasTitulo}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[texto.subtitulo, { color: color.secundario }]} numberOfLines={3}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {valor ? (
        <Text style={[texto.cuerpo, estilos.valor]} numberOfLines={1}>
          {valor}
        </Text>
      ) : null}
      {accesorio}
      {flecha ? (
        <Simbolo nombre="chevron.forward" tamano={14} color={color.terciario} peso="semibold" />
      ) : null}
    </>
  );

  if (!onPress && !onLongPress) {
    return (
      <View style={estilos.fila} accessibilityLabel={accessibilityLabel}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [estilos.fila, pressed && { backgroundColor: color.celdaPresionada }]}
    >
      {contenido}
    </Pressable>
  );
}

// Campo de texto dentro de una sección, como en los formularios de iOS.
export function CampoTexto({
  etiqueta,
  error,
  style,
  ref,
  ...props
}: TextInputProps & { etiqueta?: string; error?: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return (
    <View>
      <View style={[estilos.fila, estilos.filaCampo]}>
        {etiqueta ? (
          <Text style={[texto.cuerpo, estilos.etiquetaCampo]} numberOfLines={1}>
            {etiqueta}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={color.marcador}
          selectionColor={color.tinte}
          clearButtonMode={props.multiline ? "never" : "while-editing"}
          style={[texto.cuerpo, estilos.entrada, props.multiline && estilos.entradaMultilinea, style]}
          {...props}
        />
      </View>
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { marginHorizontal: MARGEN },
  tituloSeccion: {
    ...texto.nota,
    color: color.secundario,
    textTransform: "uppercase",
    marginHorizontal: MARGEN,
    marginBottom: 7,
  },
  caja: {
    backgroundColor: color.celda,
    borderRadius: RADIO_SECCION,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: color.separador },
  pie: { ...texto.nota, color: color.secundario, marginHorizontal: MARGEN, marginTop: 7 },
  fila: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: MARGEN,
    paddingVertical: 11,
  },
  filaCampo: { paddingVertical: 0 },
  icono: { width: LADO_ICONO, height: LADO_ICONO, alignItems: "center", justifyContent: "center" },
  iconoConFondo: { borderRadius: 7, borderCurve: "continuous" },
  textos: { flex: 1, gap: 2 },
  valor: { color: color.secundario, flexShrink: 1, maxWidth: "55%", textAlign: "right" },
  etiquetaCampo: { color: color.texto, width: 96 },
  entrada: { flex: 1, color: color.texto, paddingVertical: 11, minHeight: 44 },
  entradaMultilinea: { minHeight: 88, textAlignVertical: "top", paddingTop: 11 },
  errorCampo: { ...texto.nota, color: color.rojo, paddingHorizontal: MARGEN, paddingBottom: 10 },
});
