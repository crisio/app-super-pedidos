// En iOS y Android no se importa: el archivo de SAP se sube desde la versión web.

import { Monitor } from "@/components/iconos";
import { Encabezado, Vacio } from "@/components/ui";
import { colores } from "@/tema";

export function Importador() {
  return (
    <>
      <Encabezado titulo="Importar inventario de SAP" />
      <Vacio
        icono={<Monitor size={22} color={colores.tenue} />}
        titulo="Importa desde una computadora"
        detalle="Abre la versión web de Super Pedidos en una computadora para subir el archivo que exportaste de SAP."
      />
    </>
  );
}
