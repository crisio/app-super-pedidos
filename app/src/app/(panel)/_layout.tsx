import { Tabs } from "expo-router/js-tabs";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { usePedidos } from "@/lib/consultas";
import { useSesion, useUsuario } from "@/lib/sesion";
import { useTema } from "@/tema";

function Icono({ simbolo }: { simbolo: string }) {
  return (
    <Text style={{ fontSize: 20 }} accessibilityElementsHidden importantForAccessibility="no">
      {simbolo}
    </Text>
  );
}

function BotonSalir() {
  const t = useTema();
  const usuario = useUsuario();
  const { salir } = useSesion();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 16 }}>
      <Text style={{ color: t.tenue, fontSize: 14 }} numberOfLines={1}>
        {usuario.nombre}
      </Text>
      <Pressable accessibilityRole="button" onPress={salir} hitSlop={8}>
        <Text style={{ color: t.marca, fontSize: 14, fontWeight: "600" }}>Salir</Text>
      </Pressable>
    </View>
  );
}

export default function PanelLayout() {
  const t = useTema();
  const usuario = useUsuario();
  const { width } = useWindowDimensions();
  const pantallaAncha = width >= 900;

  // Aviso en la pestaña: pedidos nuevos sin aceptar.
  const activos = usePedidos("activos", usuario.rol === "local" ? usuario.localId : null);
  const nuevos = activos.data?.filter((pedido) => pedido.estado === "recibido").length ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: pantallaAncha ? "left" : "bottom",
        tabBarVariant: pantallaAncha ? "material" : "uikit",
        tabBarLabelPosition: pantallaAncha ? "beside-icon" : "below-icon",
        tabBarActiveTintColor: t.marca,
        tabBarInactiveTintColor: t.tenue,
        tabBarStyle: [
          { backgroundColor: t.superficie, borderColor: t.borde },
          pantallaAncha && { width: 220, minWidth: 220 },
        ],
        headerStyle: { backgroundColor: t.superficie },
        headerTintColor: t.texto,
        headerRight: () => <BotonSalir />,
        sceneStyle: { backgroundColor: t.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bandeja",
          tabBarIcon: () => <Icono simbolo="📋" />,
          tabBarBadge: nuevos > 0 ? nuevos : undefined,
        }}
      />
      <Tabs.Screen
        name="nuevo"
        options={{ title: "Nuevo pedido", tabBarIcon: () => <Icono simbolo="➕" /> }}
      />
      <Tabs.Screen
        name="disponibilidad"
        options={{ title: "Disponibilidad", tabBarIcon: () => <Icono simbolo="📦" /> }}
      />
    </Tabs>
  );
}
