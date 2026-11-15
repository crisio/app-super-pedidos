// Preferencias pequeñas del dispositivo (por ejemplo, si ya vio el tutorial).
import * as SecureStore from "expo-secure-store";

export function leerPreferencia(clave: string) {
  return SecureStore.getItemAsync(`super-pedidos.${clave}`);
}

export async function guardarPreferencia(clave: string, valor: string) {
  await SecureStore.setItemAsync(`super-pedidos.${clave}`, valor);
}
