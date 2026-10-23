// Componentes base con el estilo de Spectrum UI / Aceternity UI, hechos con
// NativeWind para que funcionen igual en web, iOS y Android.

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { colores, degradadoMarca } from "@/tema";

// Fondo de puntos con un foco de luz arriba (Spotlight / Dot background).
export function FondoDecorado({ intensidad = 0.14 }: { intensidad?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`puntos${id}`} width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={1.5} cy={1.5} r={1} fill="rgba(255,255,255,0.07)" />
          </Pattern>
          <RadialGradient id={`foco${id}`} cx="50%" cy="0%" rx="70%" ry="55%">
            <Stop offset="0" stopColor={colores.marca} stopOpacity={intensidad} />
            <Stop offset="0.6" stopColor={colores.cian} stopOpacity={intensidad / 4} />
            <Stop offset="1" stopColor={colores.fondo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#puntos${id})`} />
        <Rect width="100%" height="100%" fill={`url(#foco${id})`} />
      </Svg>
    </View>
  );
}

export function Pantalla({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-fondo">
      <FondoDecorado />
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full max-w-[1200px] self-center gap-5 p-4 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

// Aparición suave de abajo hacia arriba, escalonada por posición.
export function Aparecer({ children, indice = 0 }: { children: ReactNode; indice?: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(Math.min(indice, 8) * 45)}>
      {children}
    </Animated.View>
  );
}

const variantesTexto = {
  titulo: "text-2xl font-bold tracking-tight text-white",
  subtitulo: "text-base font-semibold text-white",
  cuerpo: "text-[15px] text-zinc-200",
  fuerte: "text-[15px] font-semibold text-white",
  tenue: "text-sm text-zinc-400",
  pequeno: "text-xs text-zinc-500",
};

export function Texto({
  variante = "cuerpo",
  className = "",
  ...props
}: TextProps & { variante?: keyof typeof variantesTexto; className?: string }) {
  return <Text {...props} className={`${variantesTexto[variante]} ${className}`} />;
}

// Etiqueta pequeña tipo "badge" de los héroes de Aceternity, con punto que late.
export function EtiquetaEnVivo({ texto, centrada = false }: { texto: string; centrada?: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 ${
        centrada ? "self-center" : "self-start"
      }`}
    >
      <PuntoPulso clase="bg-emerald-400" />
      <Text className="text-xs font-medium text-emerald-300">{texto}</Text>
    </View>
  );
}

export function Encabezado({
  etiqueta,
  titulo,
  descripcion,
}: {
  etiqueta?: string;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <View className="gap-2">
      {etiqueta ? <EtiquetaEnVivo texto={etiqueta} /> : null}
      <Text className="text-3xl font-bold tracking-tight text-white">{titulo}</Text>
      {descripcion ? <Text className="text-[15px] leading-6 text-zinc-400">{descripcion}</Text> : null}
    </View>
  );
}

// Tarjeta translúcida. Con `brillo`, lleva un borde con degradado (Glowing border).
export function Tarjeta({
  children,
  className = "",
  brillo = false,
}: {
  children: ReactNode;
  className?: string;
  brillo?: boolean;
}) {
  if (!brillo) {
    return (
      <View className={`gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 ${className}`}>
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={["rgba(52,211,153,0.55)", "rgba(255,255,255,0.06)", "rgba(34,211,238,0.45)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 17, padding: 1 }}
    >
      <View className={`gap-3 rounded-2xl bg-zinc-950 p-5 ${className}`}>{children}</View>
    </LinearGradient>
  );
}

export function Separador() {
  return <View className="h-px bg-white/10" />;
}

// Brillo que cruza el botón principal (Shimmer button de Magic UI).
function Destello({ ancho }: { ancho: number }) {
  const posicion = useSharedValue(-1);
  useEffect(() => {
    posicion.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withDelay(1600, withTiming(-1, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [posicion]);
  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: posicion.get() * ancho }, { skewX: "-20deg" }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }, estilo]}>
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 70, height: "100%", alignSelf: "center" }}
      />
    </Animated.View>
  );
}

type VarianteBoton = "primario" | "secundario" | "peligro" | "whatsapp";

const variantesBoton: Record<Exclude<VarianteBoton, "primario">, { caja: string; texto: string }> = {
  secundario: {
    caja: "border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/10",
    texto: "text-zinc-100",
  },
  peligro: {
    caja: "border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/20",
    texto: "text-red-300",
  },
  whatsapp: {
    caja: "border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/20",
    texto: "text-green-300",
  },
};

export function Boton({
  titulo,
  onPress,
  variante = "primario",
  deshabilitado = false,
  cargando = false,
  icono,
  iconoAlFinal = false,
  className = "",
}: {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  deshabilitado?: boolean;
  cargando?: boolean;
  icono?: ReactNode;
  iconoAlFinal?: boolean;
  className?: string;
}) {
  const [ancho, setAncho] = useState(0);
  const inactivo = deshabilitado || cargando;
  const contenido = (colorTexto: string, claseTexto: string) => {
    const adorno = cargando ? <ActivityIndicator size="small" color={colorTexto} /> : icono;
    return (
      <>
        {iconoAlFinal ? null : adorno}
        <Text className={`text-[15px] font-semibold ${claseTexto}`}>{titulo}</Text>
        {iconoAlFinal ? adorno : null}
      </>
    );
  };

  if (variante === "primario") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactivo, busy: cargando }}
        disabled={inactivo}
        onPress={onPress}
        onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}
        className={`overflow-hidden rounded-xl active:opacity-90 ${inactivo ? "opacity-50" : ""} ${className}`}
        style={{ boxShadow: inactivo ? undefined : "0 0 24px rgba(52, 211, 153, 0.25)" }}
      >
        <LinearGradient
          colors={[...degradadoMarca]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.botonPrimario}
        >
          {!inactivo && ancho > 0 ? <Destello ancho={ancho} /> : null}
          {contenido(colores.sobreMarca, "text-emerald-950")}
        </LinearGradient>
      </Pressable>
    );
  }

  const estilo = variantesBoton[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${estilo.caja} ${
        inactivo ? "opacity-50" : ""
      } ${className}`}
    >
      {contenido(colores.texto, estilo.texto)}
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      className={`min-h-9 flex-row items-center gap-2 rounded-full px-4 ${
        activo ? "bg-white" : "border border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <Text className={`text-sm font-medium ${activo ? "text-zinc-950" : "text-zinc-300"}`}>{etiqueta}</Text>
      {conteo !== undefined && (
        <Text
          className={`min-w-5 overflow-hidden rounded-full px-1.5 text-center text-xs font-bold ${
            activo ? "bg-zinc-900 text-white" : "bg-white/10 text-zinc-300"
          }`}
        >
          {conteo}
        </Text>
      )}
    </Pressable>
  );
}

export function FilaChips({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-0.5">
      {children}
    </ScrollView>
  );
}

export const tonos = {
  ambar: { caja: "border-amber-400/25 bg-amber-400/10", texto: "text-amber-300", punto: "bg-amber-400" },
  cielo: { caja: "border-sky-400/25 bg-sky-400/10", texto: "text-sky-300", punto: "bg-sky-400" },
  violeta: {
    caja: "border-violet-400/25 bg-violet-400/10",
    texto: "text-violet-300",
    punto: "bg-violet-400",
  },
  esmeralda: {
    caja: "border-emerald-400/25 bg-emerald-400/10",
    texto: "text-emerald-300",
    punto: "bg-emerald-400",
  },
  cian: { caja: "border-cyan-400/25 bg-cyan-400/10", texto: "text-cyan-300", punto: "bg-cyan-400" },
  gris: { caja: "border-zinc-400/20 bg-zinc-400/10", texto: "text-zinc-300", punto: "bg-zinc-400" },
  rojo: { caja: "border-red-400/25 bg-red-400/10", texto: "text-red-300", punto: "bg-red-400" },
  verde: { caja: "border-green-400/25 bg-green-400/10", texto: "text-green-300", punto: "bg-green-400" },
  indigo: { caja: "border-indigo-400/25 bg-indigo-400/10", texto: "text-indigo-300", punto: "bg-indigo-400" },
  fucsia: {
    caja: "border-fuchsia-400/25 bg-fuchsia-400/10",
    texto: "text-fuchsia-300",
    punto: "bg-fuchsia-400",
  },
  naranja: {
    caja: "border-orange-400/25 bg-orange-400/10",
    texto: "text-orange-300",
    punto: "bg-orange-400",
  },
};
export type Tono = keyof typeof tonos;

// Punto con onda expansiva (Ping), para lo que necesita atención.
export function PuntoPulso({ clase }: { clase: string }) {
  const onda = useSharedValue(0);
  useEffect(() => {
    onda.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1));
  }, [onda]);
  const estiloOnda = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - onda.get()),
    transform: [{ scale: 1 + onda.get() * 1.8 }],
  }));
  return (
    <View className="h-2 w-2 items-center justify-center">
      <Animated.View style={[StyleSheet.absoluteFill, estiloOnda]}>
        <View className={`h-2 w-2 rounded-full ${clase}`} />
      </Animated.View>
      <View className={`h-2 w-2 rounded-full ${clase}`} />
    </View>
  );
}

export function Insignia({ texto, tono, pulso = false }: { texto: string; tono: Tono; pulso?: boolean }) {
  const estilo = tonos[tono];
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1 ${estilo.caja}`}
    >
      {pulso ? (
        <PuntoPulso clase={estilo.punto} />
      ) : (
        <View className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} />
      )}
      <Text className={`text-xs font-medium ${estilo.texto}`}>{texto}</Text>
    </View>
  );
}

export function Campo({ etiqueta, error, ...props }: TextInputProps & { etiqueta: string; error?: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-zinc-300">{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.apagado}
        {...props}
        className={`min-h-12 rounded-xl border bg-zinc-950/80 px-4 py-3 text-[15px] text-zinc-100 focus:border-emerald-400/70 ${
          error ? "border-red-500/60" : "border-white/10"
        } ${props.multiline ? "min-h-24" : ""}`}
        style={[
          Platform.OS === "web" && styles.sinContornoWeb,
          props.multiline && { textAlignVertical: "top" },
        ]}
      />
      {error ? <MensajeError mensaje={error} /> : null}
    </View>
  );
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <Text accessibilityRole="alert" className="text-sm text-red-400">
      {mensaje}
    </Text>
  );
}

export function Cargando() {
  return (
    <View className="items-center p-8">
      <ActivityIndicator color={colores.marca} />
    </View>
  );
}

export function Vacio({ titulo, detalle, icono }: { titulo: string; detalle?: string; icono?: ReactNode }) {
  return (
    <View className="items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10">
      {icono ? (
        <View className="mb-1 h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
          {icono}
        </View>
      ) : null}
      <Text className="text-center text-base font-semibold text-white">{titulo}</Text>
      {detalle ? (
        <Text className="max-w-md text-center text-sm leading-5 text-zinc-400">{detalle}</Text>
      ) : null}
    </View>
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
    <View className="flex-row justify-between gap-3">
      <Text className={fuerte ? "text-base font-semibold text-white" : "text-sm text-zinc-400"}>
        {etiqueta}
      </Text>
      <Text className={fuerte ? "text-base font-bold text-white" : "text-sm text-zinc-200"}>{valor}</Text>
    </View>
  );
}

// Indicador numérico del resumen (Stat card).
export function Indicador({
  etiqueta,
  valor,
  tono,
  icono,
}: {
  etiqueta: string;
  valor: string;
  tono: Tono;
  icono: ReactNode;
}) {
  const estilo = tonos[tono];
  return (
    <View className="min-w-[150px] flex-1 gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase tracking-wider text-zinc-500">{etiqueta}</Text>
        <View className={`h-7 w-7 items-center justify-center rounded-lg border ${estilo.caja}`}>
          {icono}
        </View>
      </View>
      <Text className="text-2xl font-bold tracking-tight text-white">{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  botonPrimario: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  sinContornoWeb: { outlineWidth: 0 },
});
