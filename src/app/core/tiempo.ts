/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días"; más de una semana: la fecha corta. */
export function haceTiempo(iso: string, ahora = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((ahora - t) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
}