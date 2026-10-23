// En iOS y Android la sesión se guarda cifrada en el llavero del dispositivo.
import * as SecureStore from "expo-secure-store";

const CLAVE = "super-pedidos.sesion";

export function leerSesionGuardada() {
  return SecureStore.getItemAsync(CLAVE);
}

export function guardarSesion(valor: string) {
  return SecureStore.setItemAsync(CLAVE, valor);
}

export function borrarSesion() {
  return SecureStore.deleteItemAsync(CLAVE);
}
