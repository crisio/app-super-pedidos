import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { entregas, formatearLempiras, type ResumenPedido } from "@super-pedidos/compartido";
import { haceCuanto, minutosDesde } from "@/lib/tiempo";
import { colores } from "@/tema";
import { Clock, Store } from "./iconos";
import { InsigniaCanal, InsigniaEstado } from "./insignias";

// Un pedido nuevo sin aceptar después de este tiempo se marca como atrasado.
const MINUTOS_ALERTA_SIN_ACEPTAR = 5;

export function TarjetaPedido({
  pedido,
  ahora,
  mostrarLocal,
}: {
  pedido: ResumenPedido;
  ahora: number;
  mostrarLocal: boolean;
}) {
  const router = useRouter();
  const atrasado =
    pedido.estado === "recibido" && minutosDesde(pedido.creadoEn, ahora) >= MINUTOS_ALERTA_SIN_ACEPTAR;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Pedido ${pedido.numero} de ${pedido.clienteNombre}`}
      onPress={() => router.push(`/pedido/${pedido.id}`)}
      className={`gap-3 rounded-2xl border p-4 active:opacity-80 ${
        atrasado
          ? "border-red-500/40 bg-red-500/5 hover:border-red-400/60"
          : "border-white/10 bg-zinc-900/70 hover:border-white/20 hover:bg-zinc-900"
      }`}
      style={atrasado ? { boxShadow: "0 0 28px rgba(248, 113, 113, 0.15)" } : undefined}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-base font-bold tracking-tight text-white">#{pedido.numero}</Text>
        <View className="flex-row items-center gap-1">
          <Clock size={12} color={atrasado ? colores.peligro : colores.apagado} />
          <Text className={`text-xs ${atrasado ? "font-semibold text-red-400" : "text-zinc-500"}`}>
            {haceCuanto(pedido.creadoEn, ahora)}
          </Text>
        </View>
      </View>

      <Text className="text-[15px] font-medium text-zinc-100" numberOfLines={1}>
        {pedido.clienteNombre}
      </Text>

      <View className="flex-row flex-wrap gap-1.5">
        <InsigniaEstado estado={pedido.estado} />
        <InsigniaCanal canal={pedido.canal} />
      </View>

      <View className="flex-row items-center gap-1.5">
        {mostrarLocal ? <Store size={13} color={colores.apagado} /> : null}
        <Text className="flex-1 text-xs text-zinc-500" numberOfLines={2}>
          {mostrarLocal ? `${pedido.localNombre} · ` : ""}
          {entregas[pedido.entrega]}
        </Text>
      </View>

      <View className="h-px bg-white/5" />

      <View className="flex-row items-center justify-between gap-2">
        <Text className="shrink text-sm text-zinc-400" numberOfLines={1}>
          {pedido.unidades} {pedido.unidades === 1 ? "unidad" : "unidades"}
        </Text>
        <Text className="shrink-0 text-base font-bold text-white" numberOfLines={1}>
          {formatearLempiras(pedido.totalCentavos)}
        </Text>
      </View>
    </Pressable>
  );
}
