// Texto en minúsculas y sin tildes, para comparar y buscar.
export function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
