/**
 * Piezas comunes de los PDF que arma la plataforma sin librerías (estado de cuenta, tablas descargables): medición de texto con
 * las métricas de Helvetica, escape a Latin-1, colores, ajuste de línea y ensamblado del archivo.
 */

/* Anchos de Helvetica (por 1000 unidades) para medir texto y alinear columnas. */
const ANCHOS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Ancho en puntos de `s` a tamaño `tam` (la negrita se aproxima con un 6 % más). */
export const ancho = (s: string, tam: number, negrita = false) => {
  let u = 0;
  for (const ch of s) {
    const base = ch.normalize("NFD")[0] ?? ch;
    const c = base.charCodeAt(0);
    u += c >= 32 && c <= 126 ? (ANCHOS[c - 32] ?? 556) : 556;
  }
  return (u / 1000) * tam * (negrita ? 1.06 : 1);
};

/** Latin-1 con escapes octales (acentos y ñ); lo que WinAnsi no tiene se reemplaza. */
export const esc = (s: string) =>
  s
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\\()]/g, (c) => "\\" + c)
    .replace(/[^\x20-\x7e]/g, (c) => (c.charCodeAt(0) < 256 ? "\\" + c.charCodeAt(0).toString(8).padStart(3, "0") : "?"));

export type Rgb = [number, number, number];
export const rgb = (hex: string): Rgb => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0x00bdd2;
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const col = (c: Rgb) => c.map((x) => x.toFixed(3)).join(" ");

/** Parte el texto en líneas que caben en `max` puntos (la última se recorta con "..." si hay más de `lineas`). */
export function envolver(texto: string, max: number, tam: number, lineas: number, negrita = false): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let actual = "";
  const cortar = (p: string) => {
    // Una palabra más larga que la columna (un correo, un código) se parte por caracteres.
    let resto = p;
    while (ancho(resto, tam, negrita) > max && resto.length > 1) {
      let n = resto.length - 1;
      while (n > 1 && ancho(resto.slice(0, n), tam, negrita) > max) n--;
      out.push(resto.slice(0, n));
      resto = resto.slice(n);
    }
    return resto;
  };
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ancho(prueba, tam, negrita) <= max) actual = prueba;
    else {
      if (actual) out.push(actual);
      actual = ancho(p, tam, negrita) > max ? cortar(p) : p;
    }
  }
  if (actual) out.push(actual);
  if (out.length > lineas) {
    const resto = out.slice(0, lineas);
    let ult = resto[lineas - 1]!;
    while (ult.length > 1 && ancho(ult + "...", tam, negrita) > max) ult = ult.slice(0, -1);
    resto[lineas - 1] = ult + "...";
    return resto;
  }
  return out.length ? out : [""];
}

/** Arma el PDF a partir de los flujos de contenido de cada página (fuentes F1 = Helvetica, F2 = Helvetica-Bold). */
export function ensamblarPdf(flujos: string[], W: number, H: number): Blob {
  // Objetos: 1 catálogo, 2 páginas, 3 F1, 4 F2, luego (página, contenido) por cada página.
  const objetos: string[] = [];
  const idPagina = (i: number) => 5 + i * 2;
  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push(`<< /Type /Pages /Kids [${flujos.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] /Count ${flujos.length} >>`);
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  flujos.forEach((f, i) => {
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${idPagina(i) + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`);
    objetos.push(`<< /Length ${f.length} >>\nstream\n${f}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  // Los caracteres están en Latin-1 (los acentos van escapados), así que cada carácter es un byte.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  return new Blob([bytes], { type: "application/pdf" });
}

/** Descarga un Blob con el nombre indicado. */
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
