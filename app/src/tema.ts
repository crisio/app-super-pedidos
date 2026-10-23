import { useColorScheme } from "react-native";
import type { Canal, Estado } from "@super-pedidos/compartido";

const claro = {
  fondo: "#f6f7f3",
  superficie: "#ffffff",
  texto: "#1b2117",
  tenue: "#5f6a5a",
  borde: "#e1e5dc",
  marca: "#1d7f37",
  marcaFuerte: "#15652b",
  marcaSuave: "#e6f3e8",
  sobreMarca: "#ffffff",
  peligro: "#b4410f",
  peligroSuave: "#fdeee6",
};

export type Tema = typeof claro;

const oscuro: Tema = {
  fondo: "#10130e",
  superficie: "#191e16",
  texto: "#edf0e9",
  tenue: "#9ba596",
  borde: "#2b3226",
  marca: "#4cbb68",
  marcaFuerte: "#6bd085",
  marcaSuave: "#1c3121",
  sobreMarca: "#0b1a0f",
  peligro: "#f59563",
  peligroSuave: "#3a2116",
};

export function useTema() {
  return useColorScheme() === "dark" ? oscuro : claro;
}

type Par = { texto: string; fondo: string };

const coloresEstado: Record<"claro" | "oscuro", Record<Estado, Par>> = {
  claro: {
    recibido: { texto: "#92400e", fondo: "#fef3c7" },
    aceptado: { texto: "#1d4ed8", fondo: "#dbeafe" },
    preparando: { texto: "#6d28d9", fondo: "#ede9fe" },
    listo: { texto: "#15803d", fondo: "#dcfce7" },
    en_camino: { texto: "#0e7490", fondo: "#cffafe" },
    entregado: { texto: "#4b5563", fondo: "#f3f4f6" },
    cancelado: { texto: "#b91c1c", fondo: "#fee2e2" },
  },
  oscuro: {
    recibido: { texto: "#fcd34d", fondo: "#3d2c0a" },
    aceptado: { texto: "#93c5fd", fondo: "#172554" },
    preparando: { texto: "#c4b5fd", fondo: "#2e1065" },
    listo: { texto: "#86efac", fondo: "#14361f" },
    en_camino: { texto: "#67e8f9", fondo: "#083344" },
    entregado: { texto: "#d1d5db", fondo: "#27272a" },
    cancelado: { texto: "#fca5a5", fondo: "#450a0a" },
  },
};

const coloresCanal: Record<"claro" | "oscuro", Record<Canal, Par>> = {
  claro: {
    app: { texto: "#15652b", fondo: "#e6f3e8" },
    whatsapp: { texto: "#0f6b3a", fondo: "#d9f7e5" },
    telefono: { texto: "#1e40af", fondo: "#e0e7ff" },
    redes: { texto: "#a21caf", fondo: "#fae8ff" },
    delivery_externo: { texto: "#c2410c", fondo: "#ffedd5" },
  },
  oscuro: {
    app: { texto: "#86efac", fondo: "#14361f" },
    whatsapp: { texto: "#6ee7a8", fondo: "#0f2e1f" },
    telefono: { texto: "#a5b4fc", fondo: "#1e1b4b" },
    redes: { texto: "#f0abfc", fondo: "#3b0a3f" },
    delivery_externo: { texto: "#fdba74", fondo: "#3b1d0a" },
  },
};

export function useColorEstado(estado: Estado) {
  return coloresEstado[useColorScheme() === "dark" ? "oscuro" : "claro"][estado];
}

export function useColorCanal(canal: Canal) {
  return coloresCanal[useColorScheme() === "dark" ? "oscuro" : "claro"][canal];
}

export const ANCHO_MAXIMO = 1200;
