// Lectura del archivo en el navegador. Solo la usa la pantalla de importación en la web.

import type { ParseResult, Parser } from "papaparse";
import type { Celda, Fila } from "./sap";

const FILAS_DE_MUESTRA = 60;

export type FuenteDatos = {
  // Primeras filas, para reconocer encabezados y mostrar una vista previa.
  muestra: Fila[];
  // Recorre todas las filas sin congelar la página. `avance` va de 0 a 1.
  recorrer: (alFila: (fila: Fila) => void, avance: (fraccion: number) => void) => Promise<void>;
};

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

function celda(valor: unknown): Celda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") return valor;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const texto = String(valor).trim();
  return texto === "" ? null : texto;
}

export async function abrirArchivo(archivo: File): Promise<FuenteDatos> {
  const inicio = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
  // Los .xlsx son archivos ZIP ("PK"). Los .xls antiguos son binarios de Office.
  if (inicio[0] === 0x50 && inicio[1] === 0x4b) return abrirExcel(archivo);
  if (inicio[0] === 0xd0 && inicio[1] === 0xcf) {
    throw new Error("Es un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como .xlsx o como CSV.");
  }
  return abrirTexto(archivo);
}

async function abrirExcel(archivo: File): Promise<FuenteDatos> {
  const { readSheet } = await import("read-excel-file/browser");
  const datos = await readSheet(archivo);
  const filas = datos.map((fila) => fila.map(celda)).filter((fila) => fila.some((valor) => valor !== null));
  return {
    muestra: filas.slice(0, FILAS_DE_MUESTRA),
    async recorrer(alFila, avance) {
      for (let inicio = 0; inicio < filas.length; inicio += 5000) {
        filas.slice(inicio, inicio + 5000).forEach(alFila);
        avance(Math.min(1, (inicio + 5000) / filas.length));
        await esperar();
      }
    },
  };
}

// SAP exporta texto en UTF-16 (con BOM), UTF-8 o Windows-1252 según el sistema.
function decodificar(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  const inicio = bytes.subarray(0, 1000);
  const ceros = inicio.filter((byte, indice) => byte === 0 && indice % 2 === 1).length;
  if (inicio.length > 10 && ceros > inicio.length / 4) return new TextDecoder("utf-16le").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

async function abrirTexto(archivo: File): Promise<FuenteDatos> {
  const Papa = (await import("papaparse")).default;
  const texto = decodificar(new Uint8Array(await archivo.arrayBuffer()));
  const opciones = { skipEmptyLines: "greedy" as const };
  const filaDe = (valores: string[]): Fila => valores.map(celda);
  const muestra = Papa.parse<string[]>(texto, { ...opciones, preview: FILAS_DE_MUESTRA });
  // Se usa el mismo separador en todo el archivo, el que se detectó en la muestra.
  const delimiter = muestra.meta.delimiter;

  return {
    muestra: muestra.data.map(filaDe),
    recorrer(alFila, avance) {
      return new Promise((resolver, rechazar) => {
        Papa.parse<string[]>(texto, {
          ...opciones,
          delimiter,
          chunkSize: 1024 * 1024,
          chunk(resultado: ParseResult<string[]>, parser: Parser) {
            resultado.data.forEach((valores) => alFila(filaDe(valores)));
            avance(Math.min(1, resultado.meta.cursor / texto.length));
            parser.pause();
            setTimeout(() => parser.resume(), 0);
          },
          complete: () => resolver(),
          error: (error: Error) => rechazar(error),
        });
      });
    },
  };
}
