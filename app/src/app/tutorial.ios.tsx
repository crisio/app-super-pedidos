// Tutorial en iOS: hoja de bienvenida como las de las apps de Apple (ícono, título grande,
// cada paso con su símbolo y un botón para empezar).
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Boton, Simbolo } from "@/components/ios/controles";
import { color, texto } from "@/components/ios/sistema";
import { useUsuario } from "@/lib/sesion";
import { marcarTutorialVisto, pasosTutorial } from "@/lib/tutorial";

export default function Tutorial() {
  const usuario = useUsuario();
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const pasos = pasosTutorial(usuario.rol);

  // Cuenta como visto apenas se abre, aunque se cierre deslizando la hoja hacia abajo.
  useEffect(() => {
    marcarTutorialVisto(usuario.id);
  }, [usuario.id]);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={estilos.hoja}>
      <ScrollView contentContainerStyle={estilos.contenido} contentInsetAdjustmentBehavior="automatic">
        <View style={estilos.cabecera}>
          <LinearGradient
            colors={["#34C759", "#0B8A55"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={estilos.iconoApp}
          >
            <Simbolo nombre="basket.fill" tamano={34} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[texto.tituloGrande, estilos.titulo]}>Así funciona Super Pedidos</Text>
        </View>

        <View style={estilos.pasos}>
          {pasos.map((paso) => (
            <View
              key={paso.clave}
              style={estilos.paso}
              accessible
              accessibilityLabel={`${paso.titulo}. ${paso.texto}`}
            >
              <View style={estilos.pasoIcono}>
                <Simbolo nombre={paso.simbolo} tamano={30} color={color.tinte} />
              </View>
              <View style={estilos.pasoTextos}>
                <Text style={[texto.encabezado, { color: color.texto }]}>{paso.titulo}</Text>
                <Text style={[texto.subtitulo, { color: color.secundario }]}>{paso.texto}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: Math.max(margenes.bottom, 16) + 8 }]}>
        <Boton titulo="Empezar" onPress={cerrar} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  hoja: { flex: 1, backgroundColor: color.fondoHoja },
  contenido: { paddingHorizontal: 32, paddingTop: 44, paddingBottom: 24, gap: 36 },
  cabecera: { alignItems: "center", gap: 18 },
  iconoApp: {
    width: 72,
    height: 72,
    borderRadius: 17,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { color: color.texto, textAlign: "center" },
  pasos: { gap: 24 },
  paso: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  pasoIcono: { width: 40, alignItems: "center", paddingTop: 2 },
  pasoTextos: { flex: 1, gap: 3 },
  pie: { paddingHorizontal: 24, paddingTop: 12 },
});
