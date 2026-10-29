// Importación del inventario de SAP (solo web): el archivo se lee en el navegador y se
// manda a la API por lotes, así que su tamaño no importa.

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Text, View } from "react-native";
import {
  formatearLempiras,
  type CentroImportado,
  type ImportacionIniciada,
  type LoteImportacion,
  type ResultadoImportacion,
  type ResultadoLote,
} from "@super-pedidos/compartido";
import { CircleCheck, FileSpreadsheet, Package, Store, TriangleAlert, Upload } from "@/components/iconos";
import { Boton, Cargando, Encabezado, Indicador, MensajeError, Tarjeta } from "@/components/ui";
import { mensajeDeError } from "@/lib/api";
import { useLocales } from "@/lib/consultas";
import { abrirArchivo, type FuenteDatos } from "@/lib/importacion/leer-archivo";
import {
  Agregador,
  armarLotes,
  campos,
  detectarEncabezado,
  detectarFormatoNumero,
  parsearNumero,
  type Campo,
  type FormatoNumero,
  type Mapeo,
} from "@/lib/importacion/sap";
import { useApi } from "@/lib/sesion";
import { colores } from "@/tema";

type Paso = "elegir" | "leyendo" | "columnas" | "analizando" | "revisar" | "importando" | "listo";

type EleccionCentro =
  { tipo: "local"; localId: string } | { tipo: "nuevo"; nombre: string } | { tipo: "omitir" };

type Envio = {
  id: string;
  lotes: LoteImportacion[];
  siguiente: number;
  productos: number;
  existencias: number;
};

const claseSelect =
  "h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400/70";

const pasos: { id: Paso[]; titulo: string }[] = [
  { id: ["elegir", "leyendo"], titulo: "Archivo" },
  { id: ["columnas", "analizando"], titulo: "Columnas" },
  { id: ["revisar"], titulo: "Revisión" },
  { id: ["importando", "listo"], titulo: "Importación" },
];

function esperarPintado() {
  return new Promise((resolver) => setTimeout(resolver, 30));
}

function nombreColumna(valor: unknown, indice: number) {
  const texto = valor === null || valor === undefined ? "" : String(valor).trim();
  return texto ? `${texto} (columna ${indice + 1})` : `Columna ${indice + 1}`;
}

function Barra({ fraccion }: { fraccion: number }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-white/10">
      <View className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.round(fraccion * 100)}%` }} />
    </View>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <TriangleAlert size={16} color="#fcd34d" style={{ marginTop: 1 }} />
      <Text className="flex-1 text-sm leading-5 text-amber-100">{children}</Text>
    </View>
  );
}

export function Importador() {
  const api = useApi();
  const router = useRouter();
  const clienteConsultas = useQueryClient();
  const locales = useLocales();

  const [paso, setPaso] = useState<Paso>("elegir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fuente, setFuente] = useState<FuenteDatos | null>(null);
  const [filaEncabezado, setFilaEncabezado] = useState(0);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [formato, setFormato] = useState<FormatoNumero>("en");
  const [avance, setAvance] = useState(0);
  const [agregador, setAgregador] = useState<Agregador | null>(null);
  const [centros, setCentros] = useState<Record<string, EleccionCentro>>({});
  const [desactivarFaltantes, setDesactivarFaltantes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  // El envío en curso, para poder reintentar desde el lote que falló.
  const envio = useRef<Envio | null>(null);
  const [progreso, setProgreso] = useState({ enviados: 0, total: 0 });

  const encabezados = fuente?.muestra[filaEncabezado] ?? [];
  const filasEjemplo = fuente?.muestra.slice(filaEncabezado + 1, filaEncabezado + 6) ?? [];

  function reiniciar() {
    setPaso("elegir");
    setArchivo(null);
    setFuente(null);
    setAgregador(null);
    setResultado(null);
    setError(null);
    envio.current = null;
  }

  async function elegirArchivo(elegido: File | undefined) {
    if (!elegido) return;
    setError(null);
    setArchivo(elegido);
    setPaso("leyendo");
    await esperarPintado();
    try {
      const nuevaFuente = await abrirArchivo(elegido);
      const deteccion = detectarEncabezado(nuevaFuente.muestra);
      setFuente(nuevaFuente);
      setFilaEncabezado(deteccion.fila);
      setMapeo(deteccion.mapeo);
      setFormato(
        detectarFormatoNumero(nuevaFuente.muestra.slice(deteccion.fila + 1), [
          deteccion.mapeo.existencias,
          deteccion.mapeo.precio,
        ]),
      );
      setPaso("columnas");
    } catch (e) {
      setError(mensajeDeError(e));
      setPaso("elegir");
    }
  }

  async function analizar() {
    if (!fuente) return;
    setError(null);
    setAvance(0);
    setPaso("analizando");
    await esperarPintado();
    const nuevo = new Agregador(mapeo, formato, encabezados);
    let indice = 0;
    try {
      await fuente.recorrer((fila) => {
        if (indice++ > filaEncabezado) nuevo.agregar(fila);
      }, setAvance);
    } catch (e) {
      setError(mensajeDeError(e));
      setPaso("columnas");
      return;
    }
    const elecciones: Record<string, EleccionCentro> = {};
    for (const codigo of nuevo.filasPorCentro.keys()) {
      const existente = locales.data?.find((local) => local.codigoSap === codigo);
      elecciones[codigo] = existente
        ? { tipo: "local", localId: existente.id }
        : codigo
          ? { tipo: "nuevo", nombre: `Sucursal ${codigo}` }
          : { tipo: "omitir" };
    }
    setCentros(elecciones);
    setAgregador(nuevo);
    setPaso("revisar");
  }

  async function enviarLotes() {
    const actual = envio.current;
    if (!actual || !agregador) return;
    setError(null);
    setPaso("importando");
    try {
      while (actual.siguiente < actual.lotes.length) {
        const lote = actual.lotes[actual.siguiente];
        const respuesta = await api<ResultadoLote>(`/importaciones/${actual.id}/lote`, {
          metodo: "POST",
          cuerpo: lote,
        });
        actual.productos += respuesta.productosCambiados;
        actual.existencias += respuesta.existenciasActualizadas;
        actual.siguiente++;
        setProgreso({ enviados: actual.siguiente, total: actual.lotes.length });
      }
      const fin = await api<ResultadoImportacion>(`/importaciones/${actual.id}/terminar`, {
        metodo: "POST",
        cuerpo: {
          desactivarFaltantes,
          skus: desactivarFaltantes ? [...agregador.productos.keys()] : [],
        },
      });
      setResultado(fin);
      setPaso("listo");
      clienteConsultas.invalidateQueries({ queryKey: ["catalogo"] });
      clienteConsultas.invalidateQueries({ queryKey: ["locales"] });
    } catch (e) {
      setError(`${mensajeDeError(e)} Puedes reintentar: se continúa desde donde se quedó.`);
    }
  }

  async function importar() {
    if (!agregador || !archivo) return;
    setError(null);
    const conExistencias = mapeo.existencias !== undefined;
    const lista = conExistencias
      ? Object.entries(centros).flatMap(([codigo, eleccion]): CentroImportado[] =>
          eleccion.tipo === "local"
            ? [{ codigo, localId: eleccion.localId }]
            : eleccion.tipo === "nuevo"
              ? [{ codigo, nombreNuevo: eleccion.nombre.trim() }]
              : [],
        )
      : [];
    try {
      const inicio = await api<ImportacionIniciada>("/importaciones", {
        metodo: "POST",
        cuerpo: { archivo: archivo.name, centros: lista },
      });
      const lotes = armarLotes(agregador.productos.values(), inicio.locales);
      envio.current = { id: inicio.id, lotes, siguiente: 0, productos: 0, existencias: 0 };
      setProgreso({ enviados: 0, total: lotes.length });
      await enviarLotes();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastrando(false);
    elegirArchivo(evento.dataTransfer.files[0]);
  }

  const indicePaso = pasos.findIndex((p) => p.id.includes(paso));

  return (
    <View className="gap-5">
      <Encabezado
        titulo="Importar inventario de SAP"
        descripcion="Sube el archivo que exportaste de SAP. Se lee en tu computadora y se manda por partes, así que puede pesar lo que sea."
      />

      <View className="flex-row flex-wrap gap-2">
        {pasos.map((p, i) => (
          <View
            key={p.titulo}
            className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${
              i === indicePaso
                ? "border-emerald-400/40 bg-emerald-400/10"
                : i < indicePaso
                  ? "border-white/10 bg-white/5"
                  : "border-white/5"
            }`}
          >
            <Text className={`text-xs font-bold ${i <= indicePaso ? "text-emerald-300" : "text-zinc-600"}`}>
              {i + 1}
            </Text>
            <Text className={`text-sm ${i === indicePaso ? "text-white" : "text-zinc-500"}`}>{p.titulo}</Text>
          </View>
        ))}
      </View>

      {error ? <MensajeError mensaje={error} /> : null}

      {paso === "elegir" && (
        <div
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
        >
          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center ${
              arrastrando
                ? "border-emerald-400/70 bg-emerald-400/5"
                : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            <FileSpreadsheet size={36} color={colores.marca} />
            <span className="text-base font-semibold text-white">
              Arrastra aquí el archivo de SAP o haz clic para elegirlo
            </span>
            <span className="text-sm text-zinc-400">Excel (.xlsx), CSV o texto (.txt) exportado de SAP</span>
            <input
              type="file"
              accept=".xlsx,.csv,.txt,.tsv"
              className="hidden"
              aria-label="Archivo de inventario"
              onChange={(evento: ChangeEvent<HTMLInputElement>) => elegirArchivo(evento.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {paso === "leyendo" && (
        <Tarjeta className="items-center py-10">
          <Cargando />
          <Text className="text-sm text-zinc-400">Leyendo {archivo?.name}…</Text>
        </Tarjeta>
      )}

      {paso === "columnas" && fuente && (
        <>
          <Tarjeta>
            <Text className="text-base font-semibold text-white">Vista previa</Text>
            <Text className="text-sm text-zinc-400">
              {archivo?.name} · encabezados en la fila {filaEncabezado + 1}
            </Text>
            <div className="max-w-full overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    {encabezados.map((valor, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-semibold text-zinc-300"
                      >
                        {valor ?? `Columna ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasEjemplo.map((fila, i) => (
                    <tr key={i}>
                      {encabezados.map((_, j) => (
                        <td
                          key={j}
                          className="whitespace-nowrap border-b border-white/5 px-3 py-1.5 text-zinc-400"
                        >
                          {fila[j] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta>
            <Text className="text-base font-semibold text-white">¿Qué columna es cada dato?</Text>
            <Text className="text-sm text-zinc-400">
              Ya elegí las que reconocí. Revisa y corrige si hace falta.
            </Text>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(campos) as Campo[]).map((campo) => (
                <label key={campo} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-zinc-300">
                    {campos[campo]}
                    {campo === "sku" ? " *" : ""}
                  </span>
                  <select
                    className={claseSelect}
                    aria-label={campos[campo]}
                    value={mapeo[campo] ?? ""}
                    onChange={(evento) =>
                      setMapeo({
                        ...mapeo,
                        [campo]: evento.target.value === "" ? undefined : Number(evento.target.value),
                      })
                    }
                  >
                    <option value="">— No viene en el archivo —</option>
                    {encabezados.map((valor, i) => (
                      <option key={i} value={i}>
                        {nombreColumna(valor, i)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-300">Formato de los números</span>
                <select
                  className={claseSelect}
                  aria-label="Formato de los números"
                  value={formato}
                  onChange={(evento) => setFormato(evento.target.value as FormatoNumero)}
                >
                  <option value="en">1,234.56 (punto decimal)</option>
                  <option value="es">1.234,56 (coma decimal)</option>
                </select>
              </label>
            </div>
            <EjemplosDeNumeros filas={filasEjemplo} mapeo={mapeo} formato={formato} />
            {mapeo.nombre === undefined && (
              <Aviso>Sin descripción solo se actualizan los productos que ya existen en la app.</Aviso>
            )}
            {mapeo.existencias === undefined && (
              <Aviso>
                Sin existencias se actualiza el catálogo, pero no la disponibilidad de las sucursales.
              </Aviso>
            )}
            <View className="flex-row flex-wrap gap-2">
              <Boton titulo="Analizar archivo" onPress={analizar} deshabilitado={mapeo.sku === undefined} />
              <Boton titulo="Elegir otro archivo" variante="secundario" onPress={reiniciar} />
            </View>
          </Tarjeta>
        </>
      )}

      {paso === "analizando" && (
        <Tarjeta className="py-8">
          <Text className="text-sm text-zinc-300">Analizando {archivo?.name}…</Text>
          <Barra fraccion={avance} />
          <Text className="text-xs text-zinc-500">{Math.round(avance * 100)}%</Text>
        </Tarjeta>
      )}

      {paso === "revisar" && agregador && (
        <Revision
          agregador={agregador}
          mapeo={mapeo}
          centros={centros}
          setCentros={setCentros}
          locales={locales.data ?? []}
          desactivarFaltantes={desactivarFaltantes}
          setDesactivarFaltantes={setDesactivarFaltantes}
          onImportar={importar}
          onVolver={() => setPaso("columnas")}
        />
      )}

      {paso === "importando" && (
        <Tarjeta className="py-8">
          <View className="flex-row items-center gap-2">
            <Upload size={16} color={colores.marca} />
            <Text className="text-sm text-zinc-300">
              Enviando lote {Math.min(progreso.enviados + 1, progreso.total)} de {progreso.total}…
            </Text>
          </View>
          <Barra fraccion={progreso.total ? progreso.enviados / progreso.total : 0} />
          {error ? <Boton titulo="Reintentar" onPress={enviarLotes} /> : null}
        </Tarjeta>
      )}

      {paso === "listo" && resultado && (
        <Tarjeta brillo>
          <View className="flex-row items-center gap-2">
            <CircleCheck size={20} color={colores.marca} />
            <Text className="text-lg font-semibold text-white">Inventario importado</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <Indicador
              etiqueta="Productos nuevos o con cambios"
              valor={String(resultado.productos)}
              tono="esmeralda"
              icono={<Package size={14} color="#6ee7b7" />}
            />
            <Indicador
              etiqueta="Existencias actualizadas"
              valor={String(resultado.existencias)}
              tono="cielo"
              icono={<Store size={14} color="#7dd3fc" />}
            />
            <Indicador
              etiqueta="Agotados por no venir"
              valor={String(resultado.agotadosPorFaltar)}
              tono="ambar"
              icono={<TriangleAlert size={14} color="#fcd34d" />}
            />
            {desactivarFaltantes && (
              <Indicador
                etiqueta="Productos desactivados"
                valor={String(resultado.desactivados)}
                tono="rojo"
                icono={<TriangleAlert size={14} color="#fca5a5" />}
              />
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Boton titulo="Ver disponibilidad" onPress={() => router.push("/disponibilidad")} />
            <Boton titulo="Importar otro archivo" variante="secundario" onPress={reiniciar} />
          </View>
        </Tarjeta>
      )}
    </View>
  );
}

// Muestra cómo se interpretan los primeros números, para notar un formato equivocado.
function EjemplosDeNumeros({
  filas,
  mapeo,
  formato,
}: {
  filas: FuenteDatos["muestra"];
  mapeo: Mapeo;
  formato: FormatoNumero;
}) {
  const ejemplos = (["existencias", "precio"] as const).flatMap((campo) => {
    const columna = mapeo[campo];
    if (columna === undefined) return [];
    const crudo = filas
      .map((fila) => fila[columna])
      .find((valor) => typeof valor === "string" && valor !== "");
    if (typeof crudo !== "string") return [];
    const numero = parsearNumero(crudo, formato);
    return [`${campos[campo]}: "${crudo}" se lee como ${numero === null ? "no es un número" : numero}`];
  });
  if (ejemplos.length === 0) return null;
  return (
    <View className="gap-1 rounded-xl border border-white/10 bg-white/5 p-3">
      {ejemplos.map((ejemplo) => (
        <Text key={ejemplo} className="text-sm text-zinc-300">
          {ejemplo}
        </Text>
      ))}
    </View>
  );
}

function Revision({
  agregador,
  mapeo,
  centros,
  setCentros,
  locales,
  desactivarFaltantes,
  setDesactivarFaltantes,
  onImportar,
  onVolver,
}: {
  agregador: Agregador;
  mapeo: Mapeo;
  centros: Record<string, EleccionCentro>;
  setCentros: (centros: Record<string, EleccionCentro>) => void;
  locales: { id: string; nombre: string }[];
  desactivarFaltantes: boolean;
  setDesactivarFaltantes: (valor: boolean) => void;
  onImportar: () => Promise<void>;
  onVolver: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const productos = [...agregador.productos.values()];
  const sinPrecio = productos.filter((producto) => producto.precioCentavos === null).length;
  const sinNombre = productos.filter((producto) => producto.nombre === null).length;
  const conExistencias = mapeo.existencias !== undefined;
  const centrosOrdenados = [...agregador.filasPorCentro].sort(([a], [b]) => a.localeCompare(b));
  const nombresIncompletos = Object.values(centros).some(
    (eleccion) => eleccion.tipo === "nuevo" && eleccion.nombre.trim().length < 2,
  );

  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Indicador
          etiqueta="Filas leídas"
          valor={agregador.filasLeidas.toLocaleString("es-HN")}
          tono="gris"
          icono={<FileSpreadsheet size={14} color={colores.tenue} />}
        />
        <Indicador
          etiqueta="Productos"
          valor={agregador.productos.size.toLocaleString("es-HN")}
          tono="esmeralda"
          icono={<Package size={14} color="#6ee7b7" />}
        />
        <Indicador
          etiqueta="Centros"
          valor={String(centrosOrdenados.filter(([codigo]) => codigo).length)}
          tono="cielo"
          icono={<Store size={14} color="#7dd3fc" />}
        />
        <Indicador
          etiqueta="Sin precio"
          valor={sinPrecio.toLocaleString("es-HN")}
          tono="ambar"
          icono={<TriangleAlert size={14} color="#fcd34d" />}
        />
      </View>

      {agregador.filasSinMaterial > 0 && (
        <Aviso>
          {`${agregador.filasSinMaterial.toLocaleString("es-HN")} filas no traen código de material (totales o líneas en blanco) y se omiten.`}
        </Aviso>
      )}
      {sinPrecio > 0 && (
        <Aviso>
          {`${sinPrecio.toLocaleString("es-HN")} productos no traen precio: los que ya existen conservan el suyo y los nuevos no se pueden vender hasta cargarles precio.`}
        </Aviso>
      )}
      {sinNombre > 0 && (
        <Aviso>{`${sinNombre.toLocaleString("es-HN")} productos no traen descripción: si son nuevos, se omiten.`}</Aviso>
      )}

      {conExistencias && (
        <Tarjeta>
          <Text className="text-base font-semibold text-white">Centros de SAP → sucursales</Text>
          <Text className="text-sm text-zinc-400">
            En cada sucursal, lo que no venga en el archivo queda como agotado o fuera de su catálogo.
          </Text>
          {centrosOrdenados.map(([codigo, filas]) => {
            const eleccion = centros[codigo] ?? { tipo: "omitir" };
            const valor =
              eleccion.tipo === "local"
                ? eleccion.localId
                : eleccion.tipo === "nuevo"
                  ? "__nuevo"
                  : "__omitir";
            return (
              <View key={codigo} className="gap-2 border-t border-white/5 pt-3">
                <Text className="text-sm font-medium text-zinc-200">
                  {codigo ? `Centro ${codigo}` : "Todo el archivo (no trae columna de centro)"}
                  <Text className="text-zinc-500">{` · ${filas.toLocaleString("es-HN")} filas`}</Text>
                </Text>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className={claseSelect}
                    aria-label={`Sucursal para ${codigo ? `el centro ${codigo}` : "todo el archivo"}`}
                    value={valor}
                    onChange={(evento) => {
                      const elegido = evento.target.value;
                      setCentros({
                        ...centros,
                        [codigo]:
                          elegido === "__omitir"
                            ? { tipo: "omitir" }
                            : elegido === "__nuevo"
                              ? { tipo: "nuevo", nombre: codigo ? `Sucursal ${codigo}` : "" }
                              : { tipo: "local", localId: elegido },
                      });
                    }}
                  >
                    <option value="__omitir">No importar sus existencias</option>
                    {codigo ? <option value="__nuevo">Crear sucursal nueva</option> : null}
                    {locales.map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nombre}
                      </option>
                    ))}
                  </select>
                  {eleccion.tipo === "nuevo" && (
                    <input
                      className={claseSelect}
                      aria-label={`Nombre de la sucursal nueva para el centro ${codigo}`}
                      value={eleccion.nombre}
                      placeholder="Nombre de la sucursal"
                      onChange={(evento) =>
                        setCentros({ ...centros, [codigo]: { tipo: "nuevo", nombre: evento.target.value } })
                      }
                    />
                  )}
                </div>
              </View>
            );
          })}
        </Tarjeta>
      )}

      <Tarjeta>
        <Text className="text-base font-semibold text-white">Primeros productos</Text>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {["SKU", "Descripción", "Unidad", "Precio", "Existencias por centro"].map((titulo) => (
                  <th
                    key={titulo}
                    className="whitespace-nowrap border-b border-white/10 px-3 py-2 font-semibold text-zinc-300"
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos.slice(0, 6).map((producto) => (
                <tr key={producto.sku}>
                  <td className="whitespace-nowrap border-b border-white/5 px-3 py-1.5 text-zinc-300">
                    {producto.sku}
                  </td>
                  <td className="border-b border-white/5 px-3 py-1.5 text-zinc-300">
                    {producto.nombre ?? "—"}
                  </td>
                  <td className="border-b border-white/5 px-3 py-1.5 text-zinc-400">
                    {producto.unidad ?? "—"}
                  </td>
                  <td className="whitespace-nowrap border-b border-white/5 px-3 py-1.5 text-zinc-400">
                    {producto.precioCentavos === null ? "—" : formatearLempiras(producto.precioCentavos)}
                  </td>
                  <td className="border-b border-white/5 px-3 py-1.5 text-zinc-400">
                    {[...producto.existencias]
                      .map(
                        ([centro, cantidad]) => `${centro || "total"}: ${cantidad.toLocaleString("es-HN")}`,
                      )
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-emerald-400"
            checked={desactivarFaltantes}
            onChange={(evento) => setDesactivarFaltantes(evento.target.checked)}
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white">
              Desactivar los productos que no vienen en este archivo
            </span>
            <span className="text-sm text-zinc-400">
              Úsalo solo con el inventario completo. Los productos de prueba de la app también se desactivan.
            </span>
          </span>
        </label>
        <View className="flex-row flex-wrap gap-2">
          <Boton
            titulo={`Importar ${agregador.productos.size.toLocaleString("es-HN")} productos`}
            cargando={enviando}
            deshabilitado={nombresIncompletos || agregador.productos.size === 0}
            onPress={async () => {
              setEnviando(true);
              await onImportar();
              setEnviando(false);
            }}
          />
          <Boton titulo="Volver a las columnas" variante="secundario" onPress={onVolver} />
        </View>
      </Tarjeta>
    </>
  );
}
