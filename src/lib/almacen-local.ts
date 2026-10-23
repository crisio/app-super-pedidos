// Estado guardado en localStorage, para usarse con useSyncExternalStore.
// En el servidor siempre devuelve el valor inicial.

export function crearAlmacenLocal<T>(clave: string, inicial: T) {
  let valor: T | undefined;
  const oyentes = new Set<() => void>();

  function leer(): T {
    if (valor === undefined) {
      try {
        const guardado = window.localStorage.getItem(clave);
        valor = guardado ? (JSON.parse(guardado) as T) : inicial;
      } catch {
        valor = inicial;
      }
    }
    return valor;
  }

  function leerEnServidor(): T {
    return inicial;
  }

  function escribir(siguiente: T) {
    valor = siguiente;
    try {
      window.localStorage.setItem(clave, JSON.stringify(siguiente));
    } catch {
      // Sin almacenamiento disponible: el estado vive solo en esta pestaña.
    }
    oyentes.forEach((oyente) => oyente());
  }

  function actualizar(cambio: (actual: T) => T) {
    escribir(cambio(leer()));
  }

  function suscribir(oyente: () => void) {
    oyentes.add(oyente);
    // Mantiene sincronizadas otras pestañas abiertas.
    const alCambiarEnOtraPestana = (evento: StorageEvent) => {
      if (evento.key === clave) {
        valor = undefined;
        oyente();
      }
    };
    window.addEventListener("storage", alCambiarEnOtraPestana);
    return () => {
      oyentes.delete(oyente);
      window.removeEventListener("storage", alCambiarEnOtraPestana);
    };
  }

  return { leer, leerEnServidor, escribir, actualizar, suscribir };
}
