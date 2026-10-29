import { Upload } from "@/components/iconos";
import { Importador } from "@/components/importador";
import { Pantalla, Vacio } from "@/components/ui";
import { useUsuario } from "@/lib/sesion";
import { colores } from "@/tema";

export default function Importar() {
  const usuario = useUsuario();
  return (
    <Pantalla>
      {usuario.rol === "central" ? (
        <Importador />
      ) : (
        <Vacio
          icono={<Upload size={22} color={colores.tenue} />}
          titulo="Solo para usuarios centrales"
          detalle="La importación del inventario de SAP la hace la central para todas las sucursales."
        />
      )}
    </Pantalla>
  );
}
