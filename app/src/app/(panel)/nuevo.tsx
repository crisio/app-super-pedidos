import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import {
  calcularTotales,
  canales,
  canalesDeCaptura,
  entregas,
  formatearLempiras,
  MAX_CANTIDAD_POR_PRODUCTO,
  pagos,
  type Canal,
  type Entrega,
  type Pago,
  type ProductoCatalogo,
} from "@super-pedidos/compartido";
import { SelectorLocal } from "@/components/selector-local";
import {
  Boton,
  Campo,
  Cargando,
  Chip,
  FilaChips,
  Fila,
  Insignia,
  MensajeError,
  Pantalla,
  Tarjeta,
  Texto,
} from "@/components/ui";
import { ErrorDeApi, mensajeDeError } from "@/lib/api";
import { useCatalogo, useCrearPedido, useLocales } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { ANCHO_MAXIMO, useTema } from "@/tema";

const MAX_RESULTADOS = 40;

function nuevaClave() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export default function NuevoPedido() {
  const usuario = useUsuario();
  const router = useRouter();
  const t = useTema();
  const { width } = useWindowDimensions();
  const pantallaAncha = width >= 900;
  const esCentral = usuario.rol === "central";

  const [localElegido, setLocalElegido] = useState<string | null>(null);
  const localId = esCentral ? localElegido : usuario.localId;
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [entrega, setEntrega] = useState<Entrega>("domicilio");
  const [direccion, setDireccion] = useState("");
  const [deliveryNombre, setDeliveryNombre] = useState("");
  const [pago, setPago] = useState<Pago>("efectivo");
  const [notas, setNotas] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  // Una clave por intento: si la red falla y se reintenta, no se duplica el pedido.
  const [claveIdempotencia, setClaveIdempotencia] = useState(nuevaClave);

  const locales = useLocales();
  const catalogo = useCatalogo(localId);
  const crear = useCrearPedido();
  const errores = crear.error instanceof ErrorDeApi ? crear.error.campos : {};

  const productos = catalogo.data?.productos ?? [];
  const elegidos = productos
    .filter((producto) => (cantidades[producto.id] ?? 0) > 0)
    .map((producto) => ({ producto, cantidad: cantidades[producto.id] }));
  const totales = calcularTotales(
    elegidos.map(({ producto, cantidad }) => ({ precioCentavos: producto.precioCentavos, cantidad })),
    entrega,
  );
  const termino = normalizar(busqueda);
  const resultados = productos
    .filter(
      (producto) =>
        !termino || normalizar(producto.nombre).includes(termino) || producto.sku.toLowerCase() === termino,
    )
    .slice(0, MAX_RESULTADOS);

  function cambiarCantidad(productoId: string, cantidad: number) {
    setCantidades((actual) => {
      const siguiente = { ...actual };
      if (cantidad <= 0) delete siguiente[productoId];
      else siguiente[productoId] = Math.min(cantidad, MAX_CANTIDAD_POR_PRODUCTO);
      return siguiente;
    });
  }

  function cambiarLocal(nuevo: string | null) {
    // La disponibilidad cambia por local: se empieza la lista de nuevo.
    setLocalElegido(nuevo);
    setCantidades({});
  }

  function enviar() {
    if (!localId) return;
    crear.mutate(
      {
        claveIdempotencia,
        pedido: {
          localId,
          canal,
          clienteNombre,
          clienteTelefono,
          entrega,
          direccion,
          deliveryNombre,
          pago,
          notas,
          lineas: elegidos.map(({ producto, cantidad }) => ({ productoId: producto.id, cantidad })),
        },
      },
      {
        onSuccess: (pedido) => {
          setClienteNombre("");
          setClienteTelefono("");
          setDireccion("");
          setDeliveryNombre("");
          setNotas("");
          setCantidades({});
          setBusqueda("");
          setClaveIdempotencia(nuevaClave());
          crear.reset();
          router.push(`/pedido/${pedido.id}`);
        },
      },
    );
  }

  const formulario = (
    <>
      <Texto variante="titulo">Capturar pedido</Texto>
      <Texto variante="tenue">
        Para pedidos que llegan por WhatsApp, teléfono, redes o un delivery externo.
      </Texto>
      <Tarjeta>
        <Texto variante="subtitulo">¿Por dónde llegó?</Texto>
        <FilaChips>
          {canalesDeCaptura.map((opcion) => (
            <Chip
              key={opcion}
              etiqueta={canales[opcion]}
              activo={canal === opcion}
              onPress={() => setCanal(opcion)}
            />
          ))}
        </FilaChips>
        {esCentral && (
          <>
            <Texto variante="subtitulo">Local que lo prepara</Texto>
            {locales.data ? (
              <SelectorLocal locales={locales.data} valor={localElegido} onCambiar={cambiarLocal} />
            ) : (
              <Cargando />
            )}
            {errores.localId ? <MensajeError mensaje={errores.localId} /> : null}
          </>
        )}
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Cliente</Texto>
        <Campo
          etiqueta="Nombre"
          value={clienteNombre}
          onChangeText={setClienteNombre}
          autoComplete="name"
          error={errores.clienteNombre}
        />
        <Campo
          etiqueta="Teléfono"
          value={clienteTelefono}
          onChangeText={setClienteTelefono}
          keyboardType="phone-pad"
          placeholder="9999-9999"
          error={errores.clienteTelefono}
        />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Entrega</Texto>
        <FilaChips>
          {(Object.keys(entregas) as Entrega[]).map((opcion) => (
            <Chip
              key={opcion}
              etiqueta={entregas[opcion]}
              activo={entrega === opcion}
              onPress={() => setEntrega(opcion)}
            />
          ))}
        </FilaChips>
        {entrega === "domicilio" && (
          <Campo
            etiqueta="Dirección"
            value={direccion}
            onChangeText={setDireccion}
            multiline
            placeholder="Colonia, calle, casa y una referencia"
            error={errores.direccion}
          />
        )}
        {entrega === "delivery_externo" && (
          <Campo
            etiqueta="¿Quién lo recoge?"
            value={deliveryNombre}
            onChangeText={setDeliveryNombre}
            placeholder="Nombre del repartidor y empresa (PedidosYa, Hugo…)"
            error={errores.deliveryNombre}
          />
        )}
        <Texto variante="subtitulo">Pago</Texto>
        <FilaChips>
          {(Object.keys(pagos) as Pago[]).map((opcion) => (
            <Chip
              key={opcion}
              etiqueta={pagos[opcion]}
              activo={pago === opcion}
              onPress={() => setPago(opcion)}
            />
          ))}
        </FilaChips>
        <Campo
          etiqueta="Notas (opcional)"
          value={notas}
          onChangeText={setNotas}
          multiline
          placeholder="Por ejemplo: si no hay, cambiar por otra marca"
        />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Productos</Texto>
        {!localId ? (
          <Texto variante="tenue">Elige primero el local para ver lo que tiene disponible.</Texto>
        ) : catalogo.isPending ? (
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
            {resultados.map((producto) => (
              <FilaProducto
                key={producto.id}
                producto={producto}
                cantidad={cantidades[producto.id] ?? 0}
                onCambiar={(cantidad) => cambiarCantidad(producto.id, cantidad)}
              />
            ))}
            {resultados.length === 0 && <Texto variante="tenue">No hay productos con ese nombre.</Texto>}
            {resultados.length === MAX_RESULTADOS && (
              <Texto variante="pequeno">
                Mostrando los primeros {MAX_RESULTADOS}. Busca para encontrar más.
              </Texto>
            )}
          </>
        )}
      </Tarjeta>
    </>
  );

  const resumen = (
    <Tarjeta>
      <Texto variante="subtitulo">Resumen</Texto>
      {elegidos.length === 0 ? (
        <Texto variante="tenue">Todavía no hay productos.</Texto>
      ) : (
        elegidos.map(({ producto, cantidad }) => (
          <Fila
            key={producto.id}
            etiqueta={`${cantidad} × ${producto.nombre}`}
            valor={formatearLempiras(producto.precioCentavos * cantidad)}
          />
        ))
      )}
      <Fila etiqueta="Subtotal" valor={formatearLempiras(totales.subtotal)} />
      {entrega === "domicilio" && (
        <Fila etiqueta="Envío" valor={totales.envio === 0 ? "Gratis" : formatearLempiras(totales.envio)} />
      )}
      {totales.tarifaServicio > 0 && (
        <Fila etiqueta="Tarifa de servicio" valor={formatearLempiras(totales.tarifaServicio)} />
      )}
      <Fila etiqueta="Total" valor={formatearLempiras(totales.total)} fuerte />
      {errores.lineas ? <MensajeError mensaje={errores.lineas} /> : null}
      {crear.isError ? (
        <MensajeError
          mensaje={
            Object.keys(errores).length > 0 ? "Revisa los campos marcados." : mensajeDeError(crear.error)
          }
        />
      ) : null}
      <Boton
        titulo="Crear pedido"
        onPress={enviar}
        cargando={crear.isPending}
        deshabilitado={!localId || elegidos.length === 0}
      />
    </Tarjeta>
  );

  // En pantallas anchas el resumen queda fijo a la derecha mientras se llena el formulario.
  if (pantallaAncha) {
    return (
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            width: "100%",
            maxWidth: ANCHO_MAXIMO,
            alignSelf: "center",
          }}
        >
          <ScrollView
            style={{ flex: 2 }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            {formulario}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingLeft: 0 }}>
            {resumen}
          </ScrollView>
        </View>
      </View>
    );
  }
  return (
    <Pantalla>
      {formulario}
      {resumen}
    </Pantalla>
  );
}

function FilaProducto({
  producto,
  cantidad,
  onCambiar,
}: {
  producto: ProductoCatalogo;
  cantidad: number;
  onCambiar: (cantidad: number) => void;
}) {
  const t = useTema();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderColor: t.borde,
        opacity: producto.disponible ? 1 : 0.6,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{producto.nombre}</Texto>
        <Texto variante="pequeno">
          {producto.unidad} · {formatearLempiras(producto.precioCentavos)}
        </Texto>
      </View>
      {!producto.disponible ? (
        <Insignia texto="Agotado" color={t.peligro} fondo={t.peligroSuave} />
      ) : cantidad === 0 ? (
        <Boton titulo="Agregar" variante="secundario" onPress={() => onCambiar(1)} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <BotonCantidad
            simbolo="−"
            etiqueta={`Quitar uno: ${producto.nombre}`}
            onPress={() => onCambiar(cantidad - 1)}
          />
          <Texto variante="fuerte" style={{ minWidth: 28, textAlign: "center" }}>
            {cantidad}
          </Texto>
          <BotonCantidad
            simbolo="+"
            etiqueta={`Agregar uno: ${producto.nombre}`}
            onPress={() => onCambiar(cantidad + 1)}
          />
        </View>
      )}
    </View>
  );
}

function BotonCantidad({
  simbolo,
  etiqueta,
  onPress,
}: {
  simbolo: string;
  etiqueta: string;
  onPress: () => void;
}) {
  const t = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: t.borde,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? t.marcaSuave : t.superficie,
      })}
    >
      <Texto variante="subtitulo" style={{ color: t.marca }}>
        {simbolo}
      </Texto>
    </Pressable>
  );
}
