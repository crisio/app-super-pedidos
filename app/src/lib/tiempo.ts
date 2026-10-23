import { useEffect, useState } from "react";

// Hora actual que se refresca sola, para los "hace X min".
export function useAhora(intervaloMs = 30_000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

export function haceCuanto(fechaIso: string, ahora: number) {
  const minutos = Math.max(0, Math.floor((ahora - Date.parse(fechaIso)) / 60_000));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h ${minutos % 60} min`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

export function minutosDesde(fechaIso: string, ahora: number) {
  return Math.floor((ahora - Date.parse(fechaIso)) / 60_000);
}

function dosDigitos(valor: number) {
  return String(valor).padStart(2, "0");
}

// Fecha y hora en la zona del dispositivo, sin depender de Intl (no siempre completo en Android).
export function fechaHora(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const hora = fecha.getHours();
  const sufijo = hora < 12 ? "a. m." : "p. m.";
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)} ${hora % 12 || 12}:${dosDigitos(
    fecha.getMinutes(),
  )} ${sufijo}`;
}
