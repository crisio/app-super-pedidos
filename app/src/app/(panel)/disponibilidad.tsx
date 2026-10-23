import { useState } from "react";
import { Switch, View } from "react-native";
import { formatearLempiras, type ProductoCatalogo } from "@super-pedidos/compartido";
import { SelectorLocal } from "@/components/selector-local";
import {
  Campo,
  Cargando,
  Chip,
  FilaChips,
  MensajeError,
  Pantalla,
  Tarjeta,
  Texto,
  Vacio,
} from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useCambiarDisponibilidad, useCatalogo, useLocales } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { useTema } from "@/tema";

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
      <View style={{ gap: 4 }}>
        <Texto variante="titulo">Disponibilidad por local</Texto>
        <Texto variante="tenue">
          Marca lo que se agotó: deja de aparecer para pedidos nuevos de ese local.
        </Texto>
      </View>

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
            <Vacio titulo={soloAgotados ? "No hay productos agotados" : "No hay productos con ese filtro"} />
          ) : (
            <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
              {visibles.map((producto, indice) => (
                <FilaDisponibilidad
                  key={producto.id}
                  producto={producto}
                  primera={indice === 0}
                  onCambiar={(disponible) => cambiar.mutate({ productoId: producto.id, disponible })}
                />
              ))}
            </Tarjeta>
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
  const t = useTema();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: primera ? 0 : 1,
        borderColor: t.borde,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{producto.nombre}</Texto>
        <Texto variante="pequeno">
          {producto.sku} · {producto.unidad} · {formatearLempiras(producto.precioCentavos)}
        </Texto>
      </View>
      <Texto
        variante="pequeno"
        style={{ color: producto.disponible ? t.marca : t.peligro, fontWeight: "600" }}
      >
        {producto.disponible ? "Disponible" : "Agotado"}
      </Texto>
      <Switch
        accessibilityLabel={`${producto.nombre} disponible`}
        value={producto.disponible}
        onValueChange={onCambiar}
        trackColor={{ true: t.marca, false: t.borde }}
      />
    </View>
  );
}
