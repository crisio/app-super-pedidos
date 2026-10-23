// Colores para las piezas que no aceptan clases de Tailwind (navegación, íconos,
// degradados). Deben coincidir con tailwind.config.js.

export const colores = {
  fondo: "#09090b",
  superficie: "#111113",
  borde: "rgba(255, 255, 255, 0.08)",
  texto: "#fafafa",
  tenue: "#a1a1aa",
  apagado: "#71717a",
  marca: "#34d399",
  marcaFuerte: "#10b981",
  cian: "#22d3ee",
  sobreMarca: "#022c22",
  peligro: "#f87171",
};

// Degradado de acento (esmeralda → cian), como los bordes brillantes de Aceternity.
export const degradadoMarca = ["#34d399", "#22d3ee"] as const;

export const ANCHO_MAXIMO = 1200;
