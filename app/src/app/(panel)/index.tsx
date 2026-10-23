import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import {
  estados,
  estadosActivos,
  formatearLempiras,
  type Estado,
  type ResumenPedido,
} from "@super-pedidos/compartido";
import { CircleAlert, ClipboardList, PackageCheck, Timer, Wallet } from "@/components/iconos";
import { tonoEstado } from "@/components/insignias";
import { SelectorLocal } from "@/components/selector-local";
import { TarjetaPedido } from "@/components/tarjeta-pedido";
import {
  Aparecer,
  Cargando,
  Chip,
  Encabezado,
  FilaChips,
  Indicador,
  MensajeError,
  Pantalla,
  tonos,
  Vacio,
} from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useLocales, usePedidos, type Vista } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { useAhora } from "@/lib/tiempo";
import { colores } from "@/tema";

export default function Bandeja() {
  const usuario = useUsuario();
  const esCentral = usuario.rol === "central";
  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const localId = esCentral ? localElegido : usuario.localId;
  const [vista, setVista] = useState<Vista>("activos");
  const [filtroEstado, setFiltroEstado] = useState<Estado | null>(null);
  const { width } = useWindowDimensions();
  const ahora = useAhora();

  const locales = useLocales();
  const pedidos = usePedidos(vista, localId);
  const lista = pedidos.data ?? [];
  const tablero = vista === "activos" && width >= 1280;
  const nombreLocal = locales.data?.find((local) => local.id === usuario.localId)?.nombre;

  const conteo = (estado: Estado) => lista.filter((pedido) => pedido.estado === estado).length;
  const filtrados = filtroEstado ? lista.filter((pedido) => pedido.estado === filtroEstado) : lista;

  return (
    <Pantalla>
      <Encabezado
        etiqueta="En vivo · se actualiza cada 10 s"
        titulo={
          esCentral ? "Pedidos de todos los locales" : `Pedidos${nombreLocal ? ` · ${nombreLocal}` : ""}`
        }
        descripcion="App, WhatsApp, teléfono, redes y deliveries: todo llega aquí."
      />

      {vista === "activos" && pedidos.data && (
        <View className="flex-row flex-wrap gap-3">
          <Indicador
            etiqueta="Nuevos"
            valor={String(conteo("recibido"))}
            tono="ambar"
            icono={<CircleAlert size={14} color="#fcd34d" />}
          />
          <Indicador
            etiqueta="En preparación"
            valor={String(conteo("aceptado") + conteo("preparando"))}
            tono="violeta"
            icono={<Timer size={14} color="#c4b5fd" />}
          />
          <Indicador
            etiqueta="Listos y en camino"
            valor={String(conteo("listo") + conteo("en_camino"))}
            tono="esmeralda"
            icono={<PackageCheck size={14} color="#6ee7b7" />}
          />
          <Indicador
            etiqueta="Total en curso"
            valor={formatearLempiras(lista.reduce((suma, pedido) => suma + pedido.totalCentavos, 0))}
            tono="cian"
            icono={<Wallet size={14} color="#67e8f9" />}
          />
        </View>
      )}

      <View className="gap-3">
        {esCentral && locales.data && (
          <SelectorLocal
            locales={locales.data}
            valor={localElegido}
            onCambiar={setLocalElegido}
            permitirTodos
          />
        )}

        <FilaChips>
          <Chip
            etiqueta="En curso"
            activo={vista === "activos"}
            onPress={() => {
              setVista("activos");
              setFiltroEstado(null);
            }}
          />
          <Chip
            etiqueta="Entregados y cancelados"
            activo={vista === "cerrados"}
            onPress={() => {
              setVista("cerrados");
              setFiltroEstado(null);
            }}
          />
        </FilaChips>

        {vista === "activos" && !tablero && lista.length > 0 && (
          <FilaChips>
            <Chip etiqueta="Todos" activo={filtroEstado === null} onPress={() => setFiltroEstado(null)} />
            {estadosActivos.map((estado) => (
              <Chip
                key={estado}
                etiqueta={estados[estado]}
                conteo={conteo(estado)}
                activo={filtroEstado === estado}
                onPress={() => setFiltroEstado(estado)}
              />
            ))}
          </FilaChips>
        )}
      </View>

      {pedidos.isPending ? (
        <Cargando />
      ) : pedidos.isError && !pedidos.data ? (
        <MensajeError mensaje={mensajeDeError(pedidos.error)} />
      ) : lista.length === 0 ? (
        <Vacio
          icono={<ClipboardList size={22} color={colores.tenue} />}
          titulo={vista === "activos" ? "No hay pedidos en curso" : "Todavía no hay pedidos cerrados"}
          detalle={
            vista === "activos"
              ? "Los pedidos nuevos aparecerán aquí. Para un pedido de WhatsApp o teléfono, usa “Nuevo pedido”."
              : undefined
          }
        />
      ) : tablero ? (
        <Tablero pedidos={lista} ahora={ahora} mostrarLocal={esCentral && localId === null} />
      ) : (
        <View className="gap-3">
          {filtrados.map((pedido, indice) => (
            <Aparecer key={pedido.id} indice={indice}>
              <TarjetaPedido pedido={pedido} ahora={ahora} mostrarLocal={esCentral && localId === null} />
            </Aparecer>
          ))}
          {filtrados.length === 0 && <Vacio titulo={`No hay pedidos en “${estados[filtroEstado!]}”`} />}
        </View>
      )}
      {pedidos.isError && pedidos.data ? (
        <MensajeError mensaje="No se pudo actualizar. Reintentando…" />
      ) : null}
    </Pantalla>
  );
}

// En pantallas anchas: una columna por estado.
function Tablero({
  pedidos,
  ahora,
  mostrarLocal,
}: {
  pedidos: ResumenPedido[];
  ahora: number;
  mostrarLocal: boolean;
}) {
  return (
    <View className="flex-row items-start gap-3">
      {estadosActivos.map((estado) => (
        <Columna
          key={estado}
          estado={estado}
          pedidos={pedidos.filter((pedido) => pedido.estado === estado)}
          ahora={ahora}
          mostrarLocal={mostrarLocal}
        />
      ))}
    </View>
  );
}

function Columna({
  estado,
  pedidos,
  ahora,
  mostrarLocal,
}: {
  estado: Estado;
  pedidos: ResumenPedido[];
  ahora: number;
  mostrarLocal: boolean;
}) {
  const tono = tonos[tonoEstado[estado]];
  return (
    <View className="min-w-0 flex-1 gap-3 rounded-3xl border border-white/5 bg-white/5 p-2.5">
      <View className="flex-row items-center justify-between px-1.5 pt-1">
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-full ${tono.punto}`} />
          <Text className="text-sm font-semibold text-zinc-200">{estados[estado]}</Text>
        </View>
        <Text
          className={`overflow-hidden rounded-full border px-2 text-xs font-semibold ${tono.caja} ${tono.texto}`}
        >
          {pedidos.length}
        </Text>
      </View>
      {pedidos.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-white/10 py-6">
          <Text className="text-xs text-zinc-600">Sin pedidos</Text>
        </View>
      ) : (
        pedidos.map((pedido, indice) => (
          <Aparecer key={pedido.id} indice={indice}>
            <TarjetaPedido pedido={pedido} ahora={ahora} mostrarLocal={mostrarLocal} />
          </Aparecer>
        ))
      )}
    </View>
  );
}
