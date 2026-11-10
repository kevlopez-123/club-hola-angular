/**
 * Copia el texto de cada encabezado (th) al atributo data-label de las celdas de su columna,
 * para que en móvil las tablas .adm-table se dibujen como tarjetas (ver styles.css).
 * Observa el documento, así que sirve también para tablas que se vuelven a renderizar al paginar.
 */
function etiquetar(tabla: HTMLTableElement) {
  const cabecera = [...tabla.querySelectorAll<HTMLElement>("thead th")].map((th) => (th.textContent ?? "").trim());
  if (!cabecera.length) return;
  for (const fila of tabla.querySelectorAll<HTMLTableRowElement>("tbody tr")) {
    let i = 0;
    for (const celda of Array.from(fila.cells)) {
      if (celda.colSpan > 1) continue;
      const etiqueta = cabecera[i] ?? "";
      if (celda.getAttribute("data-label") !== etiqueta) celda.setAttribute("data-label", etiqueta);
      i += 1;
    }
  }
}

export function iniciarTablasComoTarjetas() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  let pendiente = false;
  const procesar = () => {
    pendiente = false;
    document.querySelectorAll<HTMLTableElement>("table.adm-table").forEach(etiquetar);
  };
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(procesar);
  }).observe(document.body, { childList: true, subtree: true });
}
