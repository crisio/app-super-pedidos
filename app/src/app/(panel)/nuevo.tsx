import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
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
import { Minus, Plus, Search, ShoppingBasket } from "@/components/iconos";
import { SelectorLocal } from "@/components/selector-local";
import {
  Boton,
  Campo,
  Cargando,
  Chip,
  Encabezado,
  FilaChips,
  Fila,
  FondoDecorado,
  Insignia,
  MensajeError,
  Pantalla,
  Separador,
  Tarjeta,
} from "@/components/ui";
import { ErrorDeApi, mensajeDeError } from "@/lib/api";
import { useCatalogo, useCrearPedido, useLocales } from "@/lib/consultas";
import { useUsuario } from "@/lib/sesion";
import { colores } from "@/tema";

const MAX_RESULTADOS = 40;

function nuevaClave() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <Tarjeta>
      <View className="flex-row items-center gap-3">
        <View className="h-6 w-6 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
          <Text className="text-xs font-bold text-emerald-300">{numero}</Text>
        </View>
        <Text className="text-base font-semibold text-white">{titulo}</Text>
      </View>
      {children}
    </Tarjeta>
  );
}

function Subtitulo({ children }: { children: string }) {
  return <Text className="text-sm font-medium text-zinc-300">{children}</Text>;
}

export default function NuevoPedido() {
  const usuario = useUsuario();
  const router = useRouter();
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
      <Encabezado
        titulo="Capturar pedido"
        descripcion="Para pedidos que llegan por WhatsApp, teléfono, redes o un delivery externo."
      />

      <Paso numero={1} titulo="¿Por dónde llegó?">
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
            <Subtitulo>Local que lo prepara</Subtitulo>
            {locales.data ? (
              <SelectorLocal locales={locales.data} valor={localElegido} onCambiar={cambiarLocal} />
            ) : (
              <Cargando />
            )}
            {errores.localId ? <MensajeError mensaje={errores.localId} /> : null}
          </>
        )}
      </Paso>

      <Paso numero={2} titulo="Cliente">
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
      </Paso>

      <Paso numero={3} titulo="Entrega y pago">
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
        <Subtitulo>Pago</Subtitulo>
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
      </Paso>

      <Paso numero={4} titulo="Productos">
        {!localId ? (
          <Text className="text-sm text-zinc-400">
            Elige primero el local para ver lo que tiene disponible.
          </Text>
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
            <View>
              {resultados.map((producto) => (
                <FilaProducto
                  key={producto.id}
                  producto={producto}
                  cantidad={cantidades[producto.id] ?? 0}
                  onCambiar={(cantidad) => cambiarCantidad(producto.id, cantidad)}
                />
              ))}
            </View>
            {resultados.length === 0 && (
              <View className="flex-row items-center gap-2">
                <Search size={14} color={colores.apagado} />
                <Text className="text-sm text-zinc-400">No hay productos con ese nombre.</Text>
              </View>
            )}
            {resultados.length === MAX_RESULTADOS && (
              <Text className="text-xs text-zinc-500">
                Mostrando los primeros {MAX_RESULTADOS}. Busca para encontrar más.
              </Text>
            )}
          </>
        )}
      </Paso>
    </>
  );

  const resumen = (
    <Tarjeta brillo>
      <View className="flex-row items-center gap-2">
        <ShoppingBasket size={16} color={colores.marca} />
        <Text className="text-base font-semibold text-white">Resumen</Text>
      </View>
      {elegidos.length === 0 ? (
        <Text className="text-sm text-zinc-500">Todavía no hay productos.</Text>
      ) : (
        elegidos.map(({ producto, cantidad }) => (
          <Fila
            key={producto.id}
            etiqueta={`${cantidad} × ${producto.nombre}`}
            valor={formatearLempiras(producto.precioCentavos * cantidad)}
          />
        ))
      )}
      <Separador />
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
      <View className="flex-1 bg-fondo">
        <FondoDecorado />
        <View className="w-full max-w-[1200px] flex-1 flex-row self-center">
          <ScrollView
            style={{ flex: 2 }}
            contentContainerClassName="gap-5 p-4 pb-12"
            keyboardShouldPersistTaps="handled"
          >
            {formulario}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerClassName="p-4 pl-0">
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
  return (
    <View
      className={`flex-row items-center gap-3 border-t border-white/5 py-3 ${producto.disponible ? "" : "opacity-60"}`}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-medium text-zinc-100">{producto.nombre}</Text>
        <Text className="text-xs text-zinc-500">
          {producto.unidad} · {formatearLempiras(producto.precioCentavos)}
        </Text>
      </View>
      {!producto.disponible ? (
        <Insignia texto="Agotado" tono="rojo" />
      ) : cantidad === 0 ? (
        <Boton
          titulo="Agregar"
          variante="secundario"
          icono={<Plus size={15} color={colores.texto} />}
          onPress={() => onCambiar(1)}
        />
      ) : (
        <View className="flex-row items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-1">
          <BotonCantidad etiqueta={`Quitar uno: ${producto.nombre}`} onPress={() => onCambiar(cantidad - 1)}>
            <Minus size={16} color={colores.marca} />
          </BotonCantidad>
          <Text className="min-w-7 text-center text-[15px] font-bold text-white">{cantidad}</Text>
          <BotonCantidad etiqueta={`Agregar uno: ${producto.nombre}`} onPress={() => onCambiar(cantidad + 1)}>
            <Plus size={16} color={colores.marca} />
          </BotonCantidad>
        </View>
      )}
    </View>
  );
}

function BotonCantidad({
  etiqueta,
  onPress,
  children,
}: {
  etiqueta: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-400/20 active:bg-emerald-400/20"
    >
      {children}
    </Pressable>
  );
}
