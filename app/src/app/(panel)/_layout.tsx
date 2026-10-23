import { Tabs } from "expo-router/js-tabs";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { ClipboardList, CirclePlus, LogOut, Package } from "@/components/iconos";
import { usePedidos } from "@/lib/consultas";
import { useSesion, useUsuario } from "@/lib/sesion";
import { colores } from "@/tema";

function BotonSalir() {
  const usuario = useUsuario();
  const { salir } = useSesion();
  // En celular solo se muestra la inicial para que quepa el título.
  const { width } = useWindowDimensions();
  const compacto = width < 520;
  return (
    <View className="mr-4 flex-row items-center gap-3">
      <View
        className={`flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 ${compacto ? "" : "pr-3"}`}
      >
        <View className="h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20">
          <Text className="text-xs font-bold text-emerald-300">
            {usuario.nombre.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        {compacto ? null : (
          <Text className="max-w-[140px] text-sm text-zinc-300" numberOfLines={1}>
            {usuario.nombre}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Salir"
        onPress={salir}
        hitSlop={8}
        className="flex-row items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10"
      >
        <LogOut size={15} color={colores.tenue} />
        <Text className="text-sm font-medium text-zinc-300">Salir</Text>
      </Pressable>
    </View>
  );
}

export default function PanelLayout() {
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
        tabBarActiveTintColor: colores.marca,
        tabBarInactiveTintColor: colores.apagado,
        tabBarActiveBackgroundColor: pantallaAncha ? "rgba(52, 211, 153, 0.08)" : undefined,
        tabBarBadgeStyle: { backgroundColor: colores.marca, color: colores.sobreMarca, fontWeight: "700" },
        tabBarStyle: [
          { backgroundColor: "#0c0c0e", borderColor: colores.borde },
          pantallaAncha && { width: 220, minWidth: 220 },
        ],
        headerStyle: {
          backgroundColor: colores.fondo,
          borderBottomWidth: 1,
          borderBottomColor: colores.borde,
        },
        headerShadowVisible: false,
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: "600" },
        headerRight: () => <BotonSalir />,
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bandeja",
          tabBarIcon: ({ color }) => <ClipboardList size={20} color={color} />,
          tabBarBadge: nuevos > 0 ? nuevos : undefined,
        }}
      />
      <Tabs.Screen
        name="nuevo"
        options={{
          title: "Nuevo pedido",
          tabBarIcon: ({ color }) => <CirclePlus size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="disponibilidad"
        options={{
          title: "Disponibilidad",
          tabBarIcon: ({ color }) => <Package size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
