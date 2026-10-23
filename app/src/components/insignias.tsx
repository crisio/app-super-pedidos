import { canales, estados, type Canal, type Estado } from "@super-pedidos/compartido";
import { Insignia, type Tono } from "./ui";

export const tonoEstado: Record<Estado, Tono> = {
  recibido: "ambar",
  aceptado: "cielo",
  preparando: "violeta",
  listo: "esmeralda",
  en_camino: "cian",
  entregado: "gris",
  cancelado: "rojo",
};

const tonoCanal: Record<Canal, Tono> = {
  app: "esmeralda",
  whatsapp: "verde",
  telefono: "indigo",
  redes: "fucsia",
  delivery_externo: "naranja",
};

export function InsigniaEstado({ estado }: { estado: Estado }) {
  // Los pedidos nuevos laten hasta que alguien los acepta.
  return <Insignia texto={estados[estado]} tono={tonoEstado[estado]} pulso={estado === "recibido"} />;
}

export function InsigniaCanal({ canal }: { canal: Canal }) {
  return <Insignia texto={canales[canal]} tono={tonoCanal[canal]} />;
}
