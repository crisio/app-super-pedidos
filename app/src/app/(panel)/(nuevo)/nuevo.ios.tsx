// Capturar un pedido en iOS: formulario agrupado con menús desplegables y botones − + del sistema.
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  calcularTotales,
  canales,
  canalesDeCaptura,
  formatearLempiras,
  MAX_CANTIDAD_POR_PRODUCTO,
  pagos,
  type Canal,
  type Entrega,
  type Pago,
  type ProductoCatalogo,
} from "@super-pedidos/compartido";
import {
  Aviso,
  Boton,
  Cargando,
  Contador,
  Pantalla,
  SelectorMenu,
  Simbolo,
} from "@/components/ios/controles";
import { CampoTexto, Fila, Seccion } from "@/components/ios/lista";
import { color, MARGEN, texto } from "@/components/ios/sistema";
import { ErrorDeApi, mensajeDeError } from "@/lib/api";
import { useCatalogo, useCrearPedido, useLocales, useValorPausado } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";

const MAX_RESULTADOS = 40;
const ENTREGAS: { valor: Entrega; titulo: string }[] = [
  { valor: "domicilio", titulo: "A domicilio" },
  { valor: "recoger", titulo: "Recoge" },
  { valor: "delivery_externo", titulo: "Delivery" },
];

function nuevaClave() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function NuevoPedido() {
  const usuario = useUsuario();
  const router = useRouter();
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
  // Productos elegidos con su cantidad. Se guardan aparte de la búsqueda, que cambia.
  const [elegidosPorId, setElegidosPorId] = useState<
    Record<string, { producto: ProductoCatalogo; cantidad: number }>
  >({});
  const [busqueda, setBusqueda] = useState("");
  // Una clave por intento: si la red falla y se reintenta, no se duplica el pedido.
  const [claveIdempotencia, setClaveIdempotencia] = useState(nuevaClave);

  const locales = useLocales();
  const catalogo = useCatalogo(localId, { busqueda: useValorPausado(busqueda), limite: MAX_RESULTADOS });
  const crear = useCrearPedido();
  const errores = crear.error instanceof ErrorDeApi ? crear.error.campos : {};

  const elegidos = Object.values(elegidosPorId);
  const totales = calcularTotales(
    elegidos.map(({ producto, cantidad }) => ({ precioCentavos: producto.precioCentavos, cantidad })),
    entrega,
  );
  const resultados = catalogo.data?.productos ?? [];

  function cambiarCantidad(producto: ProductoCatalogo, cantidad: number) {
    Haptics.selectionAsync();
    setElegidosPorId((actual) => {
      const siguiente = { ...actual };
      if (cantidad <= 0) delete siguiente[producto.id];
      else siguiente[producto.id] = { producto, cantidad: Math.min(cantidad, MAX_CANTIDAD_POR_PRODUCTO) };
      return siguiente;
    });
  }

  function cambiarLocal(nuevo: string) {
    // La disponibilidad cambia por local: se empieza la lista de nuevo.
    setLocalElegido(nuevo || null);
    setElegidosPorId({});
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setClienteNombre("");
          setClienteTelefono("");
          setDireccion("");
          setDeliveryNombre("");
          setNotas("");
          setElegidosPorId({});
          setBusqueda("");
          setClaveIdempotencia(nuevaClave());
          crear.reset();
          router.push(`/pedido/${pedido.id}`);
        },
        onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      },
    );
  }

  return (
    <Pantalla>
      <Text style={[texto.subtitulo, estilos.intro]}>
        Para pedidos que llegan por WhatsApp, teléfono, redes o un delivery externo.
      </Text>

      <Seccion>
        <Fila
          titulo="Llegó por"
          accesorio={
            <SelectorMenu
              valor={canal}
              opciones={canalesDeCaptura.map((opcion) => ({ valor: opcion, titulo: canales[opcion] }))}
              onCambiar={setCanal}
            />
          }
        />
        {esCentral ? (
          <Fila
            titulo="Local"
            accesorio={
              locales.data ? (
                <SelectorMenu
                  valor={localElegido ?? ""}
                  opciones={[
                    { valor: "", titulo: "Elegir" },
                    ...locales.data.map((local) => ({ valor: local.id, titulo: local.nombre })),
                  ]}
                  onCambiar={cambiarLocal}
                />
              ) : undefined
            }
          />
        ) : null}
      </Seccion>
      {errores.localId ? <Aviso mensaje={errores.localId} /> : null}

      <Seccion titulo="Cliente">
        <CampoTexto
          etiqueta="Nombre"
          value={clienteNombre}
          onChangeText={setClienteNombre}
          placeholder="Nombre y apellido"
          textContentType="name"
          autoComplete="name"
          error={errores.clienteNombre}
        />
        <CampoTexto
          etiqueta="Teléfono"
          value={clienteTelefono}
          onChangeText={setClienteTelefono}
          placeholder="9999-9999"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          error={errores.clienteTelefono}
        />
      </Seccion>

      <Seccion titulo="Entrega y pago">
        <View style={estilos.segmentos}>
          <SegmentedControl
            values={ENTREGAS.map((opcion) => opcion.titulo)}
            selectedIndex={ENTREGAS.findIndex((opcion) => opcion.valor === entrega)}
            onChange={(evento) => setEntrega(ENTREGAS[evento.nativeEvent.selectedSegmentIndex].valor)}
          />
        </View>
        {entrega === "domicilio" ? (
          <CampoTexto
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Dirección: colonia, calle, casa y una referencia"
            multiline
            error={errores.direccion}
          />
        ) : null}
        {entrega === "delivery_externo" ? (
          <CampoTexto
            etiqueta="Lo recoge"
            value={deliveryNombre}
            onChangeText={setDeliveryNombre}
            placeholder="Repartidor y empresa"
            error={errores.deliveryNombre}
          />
        ) : null}
        <Fila
          titulo="Pago"
          accesorio={
            <SelectorMenu
              valor={pago}
              opciones={(Object.keys(pagos) as Pago[]).map((opcion) => ({
                valor: opcion,
                titulo: pagos[opcion],
              }))}
              onCambiar={setPago}
            />
          }
        />
        <CampoTexto value={notas} onChangeText={setNotas} placeholder="Notas (opcional)" multiline />
      </Seccion>

      <Seccion
        titulo="Productos"
        pie={
          catalogo.data?.hayMas
            ? `Se muestran los primeros ${MAX_RESULTADOS}. Busca para encontrar más.`
            : undefined
        }
      >
        {!localId ? (
          <Fila titulo="Elige el local para ver lo que tiene disponible." tono="apagado" />
        ) : (
          <View style={estilos.buscador}>
            <Simbolo nombre="magnifyingglass" tamano={17} color={color.secundario} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Nombre, SKU o código de barras"
              placeholderTextColor={color.marcador}
              selectionColor={color.tinte}
              clearButtonMode="while-editing"
              autoCorrect={false}
              returnKeyType="search"
              style={[texto.cuerpo, estilos.buscadorEntrada]}
            />
          </View>
        )}
        {localId && catalogo.isPending ? <Cargando /> : null}
        {localId && catalogo.isError ? <Fila titulo={mensajeDeError(catalogo.error)} tono="peligro" /> : null}
        {localId && catalogo.data && resultados.length === 0 ? (
          <Fila titulo="No hay productos con ese nombre." tono="apagado" />
        ) : null}
        {localId
          ? resultados.map((producto) => (
              <FilaProducto
                key={producto.id}
                producto={producto}
                cantidad={elegidosPorId[producto.id]?.cantidad ?? 0}
                onCambiar={(cantidad) => cambiarCantidad(producto, cantidad)}
              />
            ))
          : null}
      </Seccion>

      <Seccion titulo={elegidos.length > 0 ? `Resumen · ${elegidos.length}` : "Resumen"}>
        {elegidos.length === 0 ? <Fila titulo="Todavía no hay productos." tono="apagado" /> : null}
        {elegidos.map(({ producto, cantidad }) => (
          <Fila
            key={producto.id}
            titulo={`${cantidad} × ${producto.nombre}`}
            valor={formatearLempiras(producto.precioCentavos * cantidad)}
          />
        ))}
        <Fila titulo="Subtotal" valor={formatearLempiras(totales.subtotal)} />
        {entrega === "domicilio" ? (
          <Fila titulo="Envío" valor={totales.envio === 0 ? "Gratis" : formatearLempiras(totales.envio)} />
        ) : null}
        {totales.tarifaServicio > 0 ? (
          <Fila titulo="Tarifa del delivery" valor={formatearLempiras(totales.tarifaServicio)} />
        ) : null}
        <Fila
          titulo="Total"
          accesorio={
            <Text style={[texto.encabezado, { color: color.texto }]}>{formatearLempiras(totales.total)}</Text>
          }
        />
      </Seccion>

      {errores.lineas ? <Aviso mensaje={errores.lineas} /> : null}
      {crear.isError ? (
        <Aviso
          mensaje={
            Object.keys(errores).length > 0 ? "Revisa los campos marcados." : mensajeDeError(crear.error)
          }
        />
      ) : null}

      <View style={estilos.acciones}>
        <Boton
          titulo="Crear pedido"
          onPress={enviar}
          cargando={crear.isPending}
          deshabilitado={!localId || elegidos.length === 0}
        />
      </View>
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
  const detalle = [
    producto.unidad,
    producto.precioCentavos > 0 ? formatearLempiras(producto.precioCentavos) : null,
    producto.existencias !== null ? `${producto.existencias} en existencia` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let accesorio;
  if (!producto.disponible) {
    accesorio = <Text style={[texto.subtitulo, { color: color.rojo }]}>Agotado</Text>;
  } else if (producto.precioCentavos <= 0) {
    accesorio = <Text style={[texto.subtitulo, { color: color.secundario }]}>Sin precio</Text>;
  } else if (cantidad === 0) {
    accesorio = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${producto.nombre}`}
        onPress={() => onCambiar(1)}
        hitSlop={10}
        style={({ pressed }) => pressed && { opacity: 0.4 }}
      >
        <Simbolo nombre="plus.circle.fill" tamano={26} />
      </Pressable>
    );
  } else {
    accesorio = (
      <View style={estilos.cantidad}>
        <Text style={[texto.encabezado, estilos.cantidadTexto]}>{cantidad}</Text>
        <Contador
          valor={cantidad}
          maximo={MAX_CANTIDAD_POR_PRODUCTO}
          etiqueta={`Cantidad de ${producto.nombre}`}
          onCambiar={onCambiar}
        />
      </View>
    );
  }

  return (
    <Fila
      titulo={producto.nombre}
      subtitulo={detalle}
      tono={producto.disponible && producto.precioCentavos > 0 ? "normal" : "apagado"}
      accesorio={accesorio}
    />
  );
}

const estilos = StyleSheet.create({
  intro: { color: color.secundario, marginHorizontal: MARGEN * 2 },
  segmentos: { paddingHorizontal: MARGEN, paddingVertical: 10 },
  buscador: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: MARGEN, minHeight: 44 },
  buscadorEntrada: { flex: 1, color: color.texto, paddingVertical: 11 },
  cantidad: { flexDirection: "row", alignItems: "center", gap: 10 },
  cantidadTexto: { color: color.texto, minWidth: 22, textAlign: "right", fontVariant: ["tabular-nums"] },
  acciones: { marginHorizontal: MARGEN },
});
