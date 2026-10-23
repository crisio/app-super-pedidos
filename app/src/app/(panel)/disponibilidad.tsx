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
import { useCambiarDisponibilidad, useCatalogo, useLocales } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { colores } from "@/tema";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export default function Disponibilidad() {
  const usuario = useUsuario();
  const esCentral = usuario.rol === "central";
  const locales = useLocales();
  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const localId = esCentral ? (localElegido ?? locales.data?.[0]?.id ?? null) : usuario.localId;
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [soloAgotados, setSoloAgotados] = useState(false);

  const catalogo = useCatalogo(localId);
  const cambiar = useCambiarDisponibilidad(localId);

  const productos = catalogo.data?.productos ?? [];
  const agotados = productos.filter((producto) => !producto.disponible).length;
  const termino = normalizar(busqueda);
  const visibles = productos.filter(
    (producto) =>
      (!soloAgotados || !producto.disponible) &&
      (categoria === null || producto.categoriaId === categoria) &&
      (!termino || normalizar(producto.nombre).includes(termino) || producto.sku.toLowerCase() === termino),
  );

  return (
    <Pantalla>
      <Encabezado
        titulo="Disponibilidad por local"
        descripcion="Marca lo que se agotó: deja de aparecer para pedidos nuevos de ese local."
      />

      {esCentral && locales.data && (
        <SelectorLocal locales={locales.data} valor={localId} onCambiar={setLocalElegido} />
      )}

      {catalogo.isPending ? (
        <Cargando />
      ) : catalogo.isError ? (
        <MensajeError mensaje={mensajeDeError(catalogo.error)} />
      ) : (
        <>
          <Campo
            etiqueta="Buscar producto"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Nombre o SKU"
            autoCorrect={false}
          />
          <FilaChips>
            <Chip
              etiqueta="Solo agotados"
              conteo={agotados}
              activo={soloAgotados}
              onPress={() => setSoloAgotados(!soloAgotados)}
            />
            <Chip
              etiqueta="Todas las categorías"
              activo={categoria === null}
              onPress={() => setCategoria(null)}
            />
            {catalogo.data.categorias.map((item) => (
              <Chip
                key={item.id}
                etiqueta={item.nombre}
                activo={categoria === item.id}
                onPress={() => setCategoria(item.id)}
              />
            ))}
          </FilaChips>
          {cambiar.isError ? <MensajeError mensaje={mensajeDeError(cambiar.error)} /> : null}
          {visibles.length === 0 ? (
            <Vacio
              icono={<PackageCheck size={22} color={colores.tenue} />}
              titulo={soloAgotados ? "No hay productos agotados" : "No hay productos con ese filtro"}
            />
          ) : (
            <View className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
              {visibles.map((producto, indice) => (
                <FilaDisponibilidad
                  key={producto.id}
                  producto={producto}
                  primera={indice === 0}
                  onCambiar={(disponible) => cambiar.mutate({ productoId: producto.id, disponible })}
                />
              ))}
            </View>
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
          {producto.sku} · {producto.unidad} · {formatearLempiras(producto.precioCentavos)}
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
