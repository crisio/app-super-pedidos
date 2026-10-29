import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { formatearLempiras, type ProductoCatalogo } from "@super-pedidos/compartido";
import { PackageCheck } from "@/components/iconos";
import { SelectorLocal } from "@/components/selector-local";
import {
  Campo,
  Cargando,
  Chip,
  Encabezado,
  FilaChips,
  Insignia,
  MensajeError,
  Pantalla,
  Vacio,
} from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useCambiarDisponibilidad, useCatalogo, useLocales, useValorPausado } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { colores } from "@/tema";

const RESULTADOS_POR_PAGINA = 100;
// Con los grupos de artículos de SAP pueden ser cientos: entonces se busca en vez de filtrar.
const MAX_CATEGORIAS_EN_FILTRO = 25;

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
  });
  const cambiar = useCambiarDisponibilidad(localId);
  const productos = catalogo.data?.productos ?? [];
  const categorias = catalogo.data?.categorias ?? [];

  return (
    <Pantalla>
      <Encabezado
        titulo="Disponibilidad por local"
        descripcion="Marca lo que se agotó: deja de aparecer para pedidos nuevos de ese local."
      />

      {esCentral && locales.data && (
        <SelectorLocal locales={locales.data} valor={localId} onCambiar={setLocalElegido} />
      )}

      {/* El buscador queda fuera de los estados de carga para no perder el foco al escribir. */}
      <Campo
        etiqueta="Buscar producto"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Nombre, SKU o código de barras"
        autoCorrect={false}
      />

      {catalogo.isPending ? (
        <Cargando />
      ) : catalogo.isError ? (
        <MensajeError mensaje={mensajeDeError(catalogo.error)} />
      ) : (
        <>
          <FilaChips>
            <Chip
              etiqueta="Solo agotados"
              conteo={catalogo.data.agotados}
              activo={soloAgotados}
              onPress={() => setSoloAgotados(!soloAgotados)}
            />
            {categorias.length <= MAX_CATEGORIAS_EN_FILTRO && (
              <>
                <Chip
                  etiqueta="Todas las categorías"
                  activo={categoria === null}
                  onPress={() => setCategoria(null)}
                />
                {categorias.map((item) => (
                  <Chip
                    key={item.id}
                    etiqueta={item.nombre}
                    activo={categoria === item.id}
                    onPress={() => setCategoria(item.id)}
                  />
                ))}
              </>
            )}
          </FilaChips>
          {cambiar.isError ? <MensajeError mensaje={mensajeDeError(cambiar.error)} /> : null}
          {productos.length === 0 ? (
            <Vacio
              icono={<PackageCheck size={22} color={colores.tenue} />}
              titulo={soloAgotados ? "No hay productos agotados" : "No hay productos con ese filtro"}
            />
          ) : (
            <View className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
              {productos.map((producto, indice) => (
                <FilaDisponibilidad
                  key={producto.id}
                  producto={producto}
                  primera={indice === 0}
                  onCambiar={(disponible) => cambiar.mutate({ productoId: producto.id, disponible })}
                />
              ))}
            </View>
          )}
          {catalogo.data.hayMas && (
            <Text className="text-xs text-zinc-500">
              Mostrando los primeros {RESULTADOS_POR_PAGINA}. Busca para encontrar más.
            </Text>
          )}
        </>
      )}
    </Pantalla>
  );
}

function FilaDisponibilidad({
  producto,
  primera,
  onCambiar,
}: {
  producto: ProductoCatalogo;
  primera: boolean;
  onCambiar: (disponible: boolean) => void;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 hover:bg-white/5 ${primera ? "" : "border-t border-white/5"}`}
    >
      <View className="flex-1 gap-0.5">
        <Text
          className={`text-[15px] font-medium ${producto.disponible ? "text-zinc-100" : "text-zinc-400"}`}
        >
          {producto.nombre}
        </Text>
        <Text className="text-xs text-zinc-500">
          {producto.sku} · {producto.unidad} ·{" "}
          {producto.precioCentavos > 0 ? formatearLempiras(producto.precioCentavos) : "sin precio"}
          {producto.existencias !== null ? ` · ${producto.existencias} en existencia` : ""}
        </Text>
      </View>
      <Insignia
        texto={producto.disponible ? "Disponible" : "Agotado"}
        tono={producto.disponible ? "esmeralda" : "rojo"}
      />
      <Switch
        accessibilityLabel={`${producto.nombre} disponible`}
        value={producto.disponible}
        onValueChange={onCambiar}
        trackColor={{ true: colores.marcaFuerte, false: "#27272a" }}
        thumbColor="#fafafa"
      />
    </View>
  );
}
