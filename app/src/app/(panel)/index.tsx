import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { estados, estadosActivos, type Estado, type ResumenPedido } from "@super-pedidos/compartido";
import { SelectorLocal } from "@/components/selector-local";
import { TarjetaPedido } from "@/components/tarjeta-pedido";
import { Cargando, Chip, FilaChips, MensajeError, Pantalla, Texto, Vacio } from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useLocales, usePedidos, type Vista } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { useAhora } from "@/lib/tiempo";
import { useColorEstado, useTema } from "@/tema";

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
      <View style={{ gap: 4 }}>
        <Texto variante="titulo">
          {esCentral ? "Pedidos de todos los locales" : `Pedidos${nombreLocal ? ` · ${nombreLocal}` : ""}`}
        </Texto>
        <Texto variante="pequeno">Se actualiza sola cada 10 segundos.</Texto>
      </View>

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

      {pedidos.isPending ? (
        <Cargando />
      ) : pedidos.isError && !pedidos.data ? (
        <MensajeError mensaje={mensajeDeError(pedidos.error)} />
      ) : lista.length === 0 ? (
        <Vacio
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
        <View style={{ gap: 10 }}>
          {filtrados.map((pedido) => (
            <TarjetaPedido
              key={pedido.id}
              pedido={pedido}
              ahora={ahora}
              mostrarLocal={esCentral && localId === null}
            />
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
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
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
  const t = useTema();
  const color = useColorEstado(estado);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 10,
        padding: 10,
        borderRadius: 16,
        backgroundColor: t.superficie,
        borderWidth: 1,
        borderColor: t.borde,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Texto variante="fuerte" style={{ color: color.texto }}>
          {estados[estado]}
        </Texto>
        <Texto variante="pequeno">{pedidos.length}</Texto>
      </View>
      {pedidos.map((pedido) => (
        <TarjetaPedido key={pedido.id} pedido={pedido} ahora={ahora} mostrarLocal={mostrarLocal} />
      ))}
    </View>
  );
}
