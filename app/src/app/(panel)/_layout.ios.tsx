// iOS: barra de pestañas del sistema (Liquid Glass en iOS 26) con íconos SF Symbols.
import { NativeTabs } from "expo-router/native-tabs";
import { usePedidos } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { useTutorialLaPrimeraVez } from "@/lib/tutorial";
import { TINTE_IOS } from "@/tema";

export default function PanelIOS() {
  const usuario = useUsuario();
  useTutorialLaPrimeraVez(usuario.id);
  // Aviso en la pestaña: pedidos nuevos sin aceptar.
  const activos = usePedidos("activos", usuario.rol === "local" ? usuario.localId : null);
  const nuevos = activos.data?.filter((pedido) => pedido.estado === "recibido").length ?? 0;

  return (
    <NativeTabs tintColor={TINTE_IOS}>
      <NativeTabs.Trigger name="(pedidos)">
        <NativeTabs.Trigger.Label>Pedidos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <NativeTabs.Trigger.Badge hidden={nuevos === 0}>{String(nuevos)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(nuevo)">
        <NativeTabs.Trigger.Label>Nuevo pedido</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(disponibilidad)">
        <NativeTabs.Trigger.Label>Disponibilidad</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
      </NativeTabs.Trigger>
      {/* Importar el inventario de SAP se hace desde la web. */}
      <NativeTabs.Trigger name="importar" hidden />
    </NativeTabs>
  );
}
