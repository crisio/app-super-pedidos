import { canales, estados, type Canal, type Estado } from "@super-pedidos/compartido";
import { useColorCanal, useColorEstado } from "@/tema";
import { Insignia } from "./ui";

export function InsigniaEstado({ estado }: { estado: Estado }) {
  const color = useColorEstado(estado);
  return <Insignia texto={estados[estado]} color={color.texto} fondo={color.fondo} />;
}

export function InsigniaCanal({ canal }: { canal: Canal }) {
  const color = useColorCanal(canal);
  return <Insignia texto={canales[canal]} color={color.texto} fondo={color.fondo} />;
}
