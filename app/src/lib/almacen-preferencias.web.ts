// En la web las preferencias se guardan en el navegador.

export async function leerPreferencia(clave: string) {
  try {
    return window.localStorage.getItem(`super-pedidos.${clave}`);
  } catch {
    return null;
  }
}

export async function guardarPreferencia(clave: string, valor: string) {
  try {
    window.localStorage.setItem(`super-pedidos.${clave}`, valor);
  } catch {
    // Sin almacenamiento: el tutorial vuelve a aparecer la próxima vez.
  }
}
