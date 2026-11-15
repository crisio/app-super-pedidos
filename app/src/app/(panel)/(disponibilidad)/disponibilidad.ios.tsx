// Disponibilidad en iOS: un interruptor del sistema por producto. Lo que se apaga deja de
// aparecer para pedidos nuevos de ese local.
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { formatearLempiras, type ProductoCatalogo } from "@super-pedidos/compartido";
import { Aviso, Cargando, Pantalla, Vacio } from "@/components/ios/controles";
import { Fila, Seccion } from "@/components/ios/lista";
import { BarraPanel } from "@/components/ios/pedidos";
import { color, MARGEN } from "@/components/ios/sistema";
import { mensajeDeError } from "@/lib/api";
import { useCambiarDisponibilidad, useCatalogo, useLocales, useValorPausado } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";

const RESULTADOS_POR_PAGINA = 100;
// Con los grupos de artículos de SAP pueden ser cientos: entonces se busca en vez de filtrar.
const MAX_CATEGORIAS_EN_MENU = 25;

export default function Disponibilidad() {
  const usuario = useUsuario();
  const esCentral = usuario.rol === "central";
  const locales = useLocales();
  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const localId = esCentral ? (localElegido ?? locales.data?.[0]?.id ?? null) : usuario.localId;
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [soloAgotados, setSoloAgotados] = useState(false);

  const catalogo = useCatalogo(localId, {
    busqueda: useValorPausado(busqueda),
    categoria,
    soloAgotados,
    limite: RESULTADOS_POR_PAGINA,
    contarAgotados: true,
  });
  const cambiar = useCambiarDisponibilidad(localId);
  const productos = catalogo.data?.productos ?? [];
  const categorias = catalogo.data?.categorias ?? [];
  const agotados = catalogo.data?.agotados;
  const nombreLocal = locales.data?.find((local) => local.id === localId)?.nombre;

  function cambiarDisponible(producto: ProductoCatalogo, disponible: boolean) {
    Haptics.selectionAsync();
    cambiar.mutate({ productoId: producto.id, disponible });
  }

  return (
    <>
      <Stack.SearchBar
        placeholder="Nombre, SKU o código de barras"
        onChangeText={(evento) => setBusqueda(evento.nativeEvent.text)}
        onCancelButtonPress={() => setBusqueda("")}
        autoCapitalize="none"
      />
      <BarraPanel
        locales={locales.data}
        localId={localId}
        onCambiarLocal={(nuevo) => setLocalElegido(nuevo)}
        permitirTodos={false}
      >
        {categorias.length > 0 && categorias.length <= MAX_CATEGORIAS_EN_MENU ? (
          <Stack.Toolbar.Menu
            icon={categoria ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"}
            title="Categoría"
            accessibilityLabel="Filtrar por categoría"
          >
            <Stack.Toolbar.MenuAction isOn={categoria === null} onPress={() => setCategoria(null)}>
              Todas las categorías
            </Stack.Toolbar.MenuAction>
            {categorias.map((item) => (
              <Stack.Toolbar.MenuAction
                key={item.id}
                isOn={categoria === item.id}
                onPress={() => setCategoria(item.id)}
              >
                {item.nombre}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        ) : null}
      </BarraPanel>

      <Pantalla refrescando={catalogo.isRefetching} onRefrescar={() => catalogo.refetch()}>
        <View style={estilos.segmentos}>
          <SegmentedControl
            values={["Todos", agotados ? `Agotados · ${agotados}` : "Agotados"]}
            selectedIndex={soloAgotados ? 1 : 0}
            onChange={(evento) => setSoloAgotados(evento.nativeEvent.selectedSegmentIndex === 1)}
          />
        </View>

        {cambiar.isError ? <Aviso mensaje={mensajeDeError(cambiar.error)} /> : null}

        {!localId || catalogo.isPending ? (
          <Cargando />
        ) : catalogo.isError ? (
          <Aviso mensaje={mensajeDeError(catalogo.error)} />
        ) : productos.length === 0 ? (
          <Vacio
            icono={soloAgotados ? "checkmark.seal" : "shippingbox"}
            titulo={soloAgotados ? "No hay productos agotados" : "No hay productos con ese filtro"}
            detalle={soloAgotados ? "Todo lo de este local está disponible." : undefined}
          />
        ) : (
          <Seccion
            titulo={nombreLocal ?? undefined}
            pie={
              catalogo.data.hayMas
                ? `Se muestran los primeros ${RESULTADOS_POR_PAGINA}. Busca para encontrar más.`
                : "Apaga lo que se agotó: deja de aparecer para pedidos nuevos de este local."
            }
          >
            {productos.map((producto) => (
              <Fila
                key={producto.id}
                titulo={producto.nombre}
                tono={producto.disponible ? "normal" : "apagado"}
                subtitulo={[
                  producto.sku,
                  producto.unidad,
                  producto.precioCentavos > 0 ? formatearLempiras(producto.precioCentavos) : "sin precio",
                  producto.existencias !== null ? `${producto.existencias} en existencia` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                accesorio={
                  <Switch
                    accessibilityLabel={`${producto.nombre} disponible`}
                    value={producto.disponible}
                    onValueChange={(disponible) => cambiarDisponible(producto, disponible)}
                    trackColor={{ true: color.verde }}
                  />
                }
              />
            ))}
          </Seccion>
        )}
      </Pantalla>
    </>
  );
}

const estilos = StyleSheet.create({
  segmentos: { marginHorizontal: MARGEN },
});
