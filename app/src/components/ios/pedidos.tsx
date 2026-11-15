// Piezas de iOS que comparten la bandeja, el detalle y el nuevo pedido.
import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { Alert, type ColorValue } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  canales,
  formatearLempiras,
  type Canal,
  type Local,
  type ResumenPedido,
} from "@super-pedidos/compartido";
import { useSesion, useUsuario } from "@/lib/sesion";
import { haceCuanto, minutosDesde } from "@/lib/tiempo";
import { InsigniaEstado, Simbolo } from "./controles";
import { Fila } from "./lista";
import { color } from "./sistema";

export const iconoCanal: Record<Canal, { simbolo: SFSymbol; color: ColorValue }> = {
  app: { simbolo: "iphone", color: color.tinte },
  whatsapp: { simbolo: "message.fill", color: "#25D366" },
  telefono: { simbolo: "phone.fill", color: color.azul },
  redes: { simbolo: "bubble.left.and.bubble.right.fill", color: color.morado },
  delivery_externo: { simbolo: "bicycle", color: color.naranja },
};

// Pasados estos minutos sin aceptar, el pedido nuevo se marca como atrasado.
const MINUTOS_ATRASADO = 10;

export function FilaPedido({
  pedido,
  ahora,
  mostrarLocal,
  mostrarEstado = false,
  onPress,
}: {
  pedido: ResumenPedido;
  ahora: number;
  mostrarLocal: boolean;
  mostrarEstado?: boolean;
  onPress: () => void;
}) {
  const canal = iconoCanal[pedido.canal];
  const atrasado = pedido.estado === "recibido" && minutosDesde(pedido.creadoEn, ahora) >= MINUTOS_ATRASADO;
  return (
    <Fila
      icono={canal.simbolo}
      colorIcono={canal.color}
      titulo={`#${pedido.numero} · ${pedido.clienteNombre}`}
      subtitulo={[
        canales[pedido.canal],
        mostrarLocal ? pedido.localNombre : null,
        haceCuanto(pedido.creadoEn, ahora),
      ]
        .filter(Boolean)
        .join(" · ")}
      valor={formatearLempiras(pedido.totalCentavos)}
      accesorio={
        mostrarEstado ? (
          <InsigniaEstado estado={pedido.estado} />
        ) : atrasado ? (
          <Simbolo nombre="exclamationmark.circle.fill" color={color.naranja} />
        ) : undefined
      }
      flecha
      onPress={onPress}
      accessibilityLabel={`Pedido ${pedido.numero} de ${pedido.clienteNombre}${atrasado ? ", lleva rato sin aceptar" : ""}`}
    />
  );
}

// Botones de la barra de título: el local que se está viendo (solo la central) y la cuenta.
export function BarraPanel({
  locales,
  localId,
  onCambiarLocal,
  permitirTodos = true,
  children,
}: {
  locales?: Local[];
  localId: string | null;
  onCambiarLocal: (localId: string | null) => void;
  permitirTodos?: boolean;
  // Botones o menús propios de la pantalla, antes del de la cuenta.
  children?: ReactNode;
}) {
  const usuario = useUsuario();
  const { salir } = useSesion();

  function confirmarSalida() {
    Alert.alert("¿Cerrar sesión?", "Para volver a entrar te enviaremos un código a tu correo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: salir },
    ]);
  }

  return (
    <Stack.Toolbar placement="right">
      {usuario.rol === "central" && locales ? (
        <Stack.Toolbar.Menu icon="storefront" title="Local" accessibilityLabel="Elegir local">
          {permitirTodos ? (
            <Stack.Toolbar.MenuAction isOn={localId === null} onPress={() => onCambiarLocal(null)}>
              Todos los locales
            </Stack.Toolbar.MenuAction>
          ) : null}
          {locales.map((local) => (
            <Stack.Toolbar.MenuAction
              key={local.id}
              isOn={localId === local.id}
              onPress={() => onCambiarLocal(local.id)}
            >
              {local.nombre}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      ) : null}
      {children}
      <Stack.Toolbar.Menu
        icon="person.crop.circle"
        title={`${usuario.nombre} · ${usuario.rol === "central" ? "Central" : "Local"}`}
        accessibilityLabel="Cuenta"
      >
        <Stack.Toolbar.MenuAction
          icon="rectangle.portrait.and.arrow.right"
          destructive
          onPress={confirmarSalida}
        >
          Cerrar sesión
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
