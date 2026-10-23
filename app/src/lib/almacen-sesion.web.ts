// En la web la sesión se guarda en el navegador.

const CLAVE = "super-pedidos.sesion";

export async function leerSesionGuardada() {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export async function guardarSesion(valor: string) {
  try {
    window.localStorage.setItem(CLAVE, valor);
  } catch {
    // Sin almacenamiento: la sesión dura mientras la página esté abierta.
  }
}

export async function borrarSesion() {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
