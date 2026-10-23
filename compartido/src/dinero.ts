// Los montos se manejan en centavos (enteros) para no arrastrar errores de redondeo.

export function formatearLempiras(centavos: number) {
  const signo = centavos < 0 ? "-" : "";
  const [enteros, decimales] = (Math.abs(centavos) / 100).toFixed(2).split(".");
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${signo}L ${conMiles}.${decimales}`;
}
