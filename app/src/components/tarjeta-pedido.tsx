import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { entregas, formatearLempiras, type ResumenPedido } from "@super-pedidos/compartido";
import { haceCuanto, minutosDesde } from "@/lib/tiempo";
import { useTema } from "@/tema";
import { InsigniaCanal, InsigniaEstado } from "./insignias";
import { Texto } from "./ui";

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
  const t = useTema();
  const router = useRouter();
  const atrasado =
    pedido.estado === "recibido" && minutosDesde(pedido.creadoEn, ahora) >= MINUTOS_ALERTA_SIN_ACEPTAR;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Pedido ${pedido.numero} de ${pedido.clienteNombre}`}
      onPress={() => router.push(`/pedido/${pedido.id}`)}
      style={({ pressed }) => ({
        backgroundColor: t.superficie,
        borderColor: atrasado ? t.peligro : t.borde,
        borderWidth: atrasado ? 2 : 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Texto variante="fuerte">#{pedido.numero}</Texto>
        <Texto variante="pequeno" style={atrasado ? { color: t.peligro, fontWeight: "700" } : undefined}>
          {haceCuanto(pedido.creadoEn, ahora)}
        </Texto>
      </View>
      <Texto variante="cuerpo" numberOfLines={1}>
        {pedido.clienteNombre}
      </Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <InsigniaEstado estado={pedido.estado} />
        <InsigniaCanal canal={pedido.canal} />
      </View>
      <Texto variante="pequeno" numberOfLines={2}>
        {mostrarLocal ? `${pedido.localNombre} · ` : ""}
        {entregas[pedido.entrega]}
      </Texto>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Texto variante="tenue" numberOfLines={1} style={{ flexShrink: 1 }}>
          {pedido.unidades} {pedido.unidades === 1 ? "unidad" : "unidades"}
        </Texto>
        <Texto variante="fuerte" numberOfLines={1} style={{ flexShrink: 0 }}>
          {formatearLempiras(pedido.totalCentavos)}
        </Texto>
      </View>
    </Pressable>
  );
}
