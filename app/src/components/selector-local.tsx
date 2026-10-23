import type { Local } from "@super-pedidos/compartido";
import { Chip, FilaChips } from "./ui";

// Para usuarios centrales: elegir local. Con "todos", se puede ver la cadena completa.
export function SelectorLocal({
  locales,
  valor,
  onCambiar,
  permitirTodos = false,
}: {
  locales: Local[];
  valor: string | null;
  onCambiar: (localId: string | null) => void;
  permitirTodos?: boolean;
}) {
  return (
    <FilaChips>
      {permitirTodos && (
        <Chip etiqueta="Todos los locales" activo={valor === null} onPress={() => onCambiar(null)} />
      )}
      {locales.map((local) => (
        <Chip
          key={local.id}
          etiqueta={local.nombre}
          activo={valor === local.id}
          onPress={() => onCambiar(local.id)}
        />
      ))}
    </FilaChips>
  );
}
