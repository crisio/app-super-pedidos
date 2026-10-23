// Estilo inspirado en Spectrum UI y Aceternity UI: oscuro, bordes sutiles,
// superficies translúcidas y acentos con degradado verde esmeralda.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // La app siempre es oscura. Con "media", NativeWind lanza un error en la web.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fondo: "#09090b",
        superficie: "#111113",
        marca: {
          DEFAULT: "#34d399",
          fuerte: "#10b981",
          suave: "#6ee7b7",
        },
      },
    },
  },
  plugins: [],
};
