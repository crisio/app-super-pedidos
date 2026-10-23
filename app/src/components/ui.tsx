import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { ANCHO_MAXIMO, useTema } from "@/tema";

export function Pantalla({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTema();
  const contenido = {
    width: "100%" as const,
    maxWidth: ANCHO_MAXIMO,
    alignSelf: "center" as const,
    padding: 16,
    gap: 16,
  };
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <View style={[contenido, { flex: 1 }]}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.fondo }}
      contentContainerStyle={[contenido, { paddingBottom: 48 }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

type VarianteTexto = "titulo" | "subtitulo" | "cuerpo" | "fuerte" | "tenue" | "pequeno";

export function Texto({ variante = "cuerpo", style, ...props }: TextProps & { variante?: VarianteTexto }) {
  const t = useTema();
  const estilos = {
    titulo: { fontSize: 22, fontWeight: "700" as const, color: t.texto },
    subtitulo: { fontSize: 17, fontWeight: "600" as const, color: t.texto },
    cuerpo: { fontSize: 15, color: t.texto },
    fuerte: { fontSize: 15, fontWeight: "600" as const, color: t.texto },
    tenue: { fontSize: 14, color: t.tenue },
    pequeno: { fontSize: 12, color: t.tenue },
  };
  return <Text {...props} style={[estilos[variante], style]} />;
}

export function Tarjeta({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: t.superficie,
          borderColor: t.borde,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type VarianteBoton = "primario" | "secundario" | "peligro";

export function Boton({
  titulo,
  onPress,
  variante = "primario",
  deshabilitado = false,
  cargando = false,
  style,
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  deshabilitado?: boolean;
  cargando?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTema();
  const colores = {
    primario: { fondo: t.marca, texto: t.sobreMarca, borde: t.marca },
    secundario: { fondo: t.superficie, texto: t.texto, borde: t.borde },
    peligro: { fondo: t.peligroSuave, texto: t.peligro, borde: t.peligroSuave },
  }[variante];
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          paddingHorizontal: 18,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colores.borde,
          backgroundColor: colores.fondo,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: inactivo ? 0.55 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {cargando && <ActivityIndicator size="small" color={colores.texto} />}
      <Text style={{ color: colores.texto, fontSize: 15, fontWeight: "600" }}>{titulo}</Text>
    </Pressable>
  );
}

export function Chip({
  etiqueta,
  activo,
  onPress,
  conteo,
}: {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
  conteo?: number;
}) {
  const t = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        minHeight: 38,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: activo ? t.marca : t.borde,
        backgroundColor: activo ? t.marca : t.superficie,
      }}
    >
      <Text style={{ color: activo ? t.sobreMarca : t.texto, fontSize: 14, fontWeight: "500" }}>
        {etiqueta}
      </Text>
      {conteo !== undefined && (
        <Text
          style={{
            minWidth: 20,
            textAlign: "center",
            fontSize: 12,
            fontWeight: "700",
            color: activo ? t.marca : t.tenue,
            backgroundColor: activo ? t.sobreMarca : t.fondo,
            borderRadius: 999,
            paddingHorizontal: 6,
            overflow: "hidden",
          }}
        >
          {conteo}
        </Text>
      )}
    </Pressable>
  );
}

export function FilaChips({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {children}
    </ScrollView>
  );
}

export function Insignia({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return (
    <Text
      style={{
        alignSelf: "flex-start",
        color,
        backgroundColor: fondo,
        fontSize: 12,
        fontWeight: "600",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      {texto}
    </Text>
  );
}

export function Campo({
  etiqueta,
  error,
  style,
  ...props
}: TextInputProps & { etiqueta: string; error?: string }) {
  const t = useTema();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: t.texto }}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={t.tenue}
        {...props}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? t.peligro : t.borde,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            color: t.texto,
            backgroundColor: t.superficie,
          },
          props.multiline && { minHeight: 84, textAlignVertical: "top" },
          style,
        ]}
      />
      {error ? <MensajeError mensaje={error} /> : null}
    </View>
  );
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  const t = useTema();
  return (
    <Text accessibilityRole="alert" style={{ color: t.peligro, fontSize: 14 }}>
      {mensaje}
    </Text>
  );
}

export function Cargando() {
  const t = useTema();
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <ActivityIndicator color={t.marca} />
    </View>
  );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <Tarjeta style={{ alignItems: "center", paddingVertical: 32 }}>
      <Texto variante="subtitulo">{titulo}</Texto>
      {detalle ? (
        <Texto variante="tenue" style={{ textAlign: "center" }}>
          {detalle}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

export function Fila({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Texto variante={fuerte ? "fuerte" : "tenue"}>{etiqueta}</Texto>
      <Texto variante={fuerte ? "fuerte" : "cuerpo"}>{valor}</Texto>
    </View>
  );
}
