/**
 * Tabla descargable en PDF (listados del panel): banda con el color de la marca, título, fecha de generación y tabla paginada
 * con encabezado repetido. Apaisada cuando hay muchas columnas. Sin librerías (ver pdf-base).
 */
import { ancho, col, ensamblarPdf, envolver, esc, rgb, type Rgb } from "./pdf-base";

export interface DatosTabla {
  programa: string;
  titulo: string;
  subtitulo?: string;
  generado: string;
  /** Color de la marca (#rrggbb). */
  color: string;
  columnas: string[];
  filas: (string | number)[][];
}

/** Punto de miles y coma decimal (como en español); "de-DE" agrupa también los números de cuatro cifras, "es" no. */
const formatoNumero = (n: number) => (Number.isInteger(n) ? n.toLocaleString("de-DE") : n.toLocaleString("de-DE", { maximumFractionDigits: 2 }));
const comoTexto = (v: string | number | null | undefined) => (typeof v === "number" ? formatoNumero(v) : String(v ?? ""));

/** Reparte el ancho útil entre las columnas según lo que miden sus textos (con mínimo y máximo razonables). */
export function anchosColumnas(columnas: string[], filas: (string | number)[][], util: number, tam: number): number[] {
  const deseado = columnas.map((c, i) => {
    let m = ancho(c.toUpperCase(), tam - 1, true);
    for (const f of filas.slice(0, 200)) m = Math.max(m, Math.min(ancho(comoTexto(f[i]), tam), 230));
    return Math.max(m + 14, 44);
  });
  const suma = deseado.reduce((s, x) => s + x, 0);
  return deseado.map((x) => (x / suma) * util);
}

export function pdfTabla(d: DatosTabla): Blob {
  const apaisado = d.columnas.length > 5;
  const W = apaisado ? 842 : 595;
  const H = apaisado ? 595 : 842;
  const M = 36;
  const primario = rgb(d.color);
  const gris: Rgb = [0.45, 0.47, 0.5];
  const texto: Rgb = [0.1, 0.12, 0.15];
  const tam = 8.5;
  const anchos = anchosColumnas(d.columnas, d.filas, W - 2 * M, tam);
  const xs = anchos.reduce<number[]>((a, w, i) => (a.push(i ? a[i - 1]! + anchos[i - 1]! : M), a), []);
  const numerica = d.columnas.map((_, i) => d.filas.length > 0 && d.filas.every((f) => typeof f[i] === "number" || f[i] === "" || f[i] == null));

  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = 0;
  const rect = (x: number, yy: number, w: number, h: number, c: Rgb) => ops.push(`${col(c)} rg`, `${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const txt = (s: string, x: number, yy: number, t: number, c: Rgb, negrita = false, alinear: "i" | "d" = "i") => {
    const px = alinear === "d" ? x - ancho(s, t, negrita) : x;
    ops.push("BT", `${col(c)} rg`, `/${negrita ? "F2" : "F1"} ${t} Tf`, `${px.toFixed(2)} ${yy.toFixed(2)} Td`, `(${esc(s)}) Tj`, "ET");
  };
  const linea = (yy: number) => ops.push("0.88 0.89 0.91 RG", "0.5 w", `${M} ${yy} m ${W - M} ${yy} l S`);

  const cabecera = () => {
    rect(M, y - 24, W - 2 * M, 24, primario);
    d.columnas.forEach((c, i) => {
      const t = envolver(c.toUpperCase(), anchos[i]! - 12, tam - 1, 1, true)[0]!;
      if (numerica[i]) txt(t, xs[i]! + anchos[i]! - 6, y - 16, tam - 1, [1, 1, 1], true, "d");
      else txt(t, xs[i]! + 6, y - 16, tam - 1, [1, 1, 1], true);
    });
    y -= 24;
  };
  const nueva = (primera: boolean) => {
    if (ops.length) paginas.push(ops);
    ops = [];
    if (primera) {
      rect(0, H - 78, W, 78, primario);
      txt(d.programa, M, H - 30, 10, [1, 1, 1]);
      txt(d.titulo, M, H - 56, 20, [1, 1, 1], true);
      y = H - 78 - 24;
      txt(`Generado el ${d.generado}`, W - M, y, 9, gris, false, "d");
      if (d.subtitulo) txt(d.subtitulo, M, y, 9, gris);
      y -= 8;
      txt(`${d.filas.length} ${d.filas.length === 1 ? "registro" : "registros"}`, M, y - 6, 9, texto, true);
      y -= 18;
    } else {
      rect(0, H - 8, W, 8, primario);
      y = H - 34;
      txt(`${d.titulo} (continuación)`, M, y, 9, gris);
      y -= 12;
    }
    cabecera();
  };

  nueva(true);
  d.filas.forEach((f, r) => {
    const celdas = d.columnas.map((_, i) => envolver(comoTexto(f[i]), anchos[i]! - 12, tam, 3));
    const lineas = Math.max(...celdas.map((c) => c.length));
    const alto = 10 + lineas * 10.5;
    if (y - alto < 50) nueva(false);
    if (r % 2 === 1) rect(M, y - alto, W - 2 * M, alto, [0.975, 0.98, 0.985]);
    celdas.forEach((ls, i) =>
      ls.forEach((l, k) => {
        const yy = y - 12 - k * 10.5;
        if (numerica[i]) txt(l, xs[i]! + anchos[i]! - 6, yy, tam, texto, false, "d");
        else txt(l, xs[i]! + 6, yy, tam, texto);
      }),
    );
    y -= alto;
    linea(y);
  });
  if (!d.filas.length) txt("No hay registros para mostrar.", M + 6, y - 18, 10, gris);
  paginas.push(ops);

  const total = paginas.length;
  const flujos = paginas.map((p, i) => {
    const pie: string[] = [];
    const prev = ops;
    ops = pie;
    linea(34);
    txt(`${d.programa} - Documento generado desde el panel de administración.`, M, 22, 7.5, gris);
    txt(`Página ${i + 1} de ${total}`, W - M, 22, 7.5, gris, false, "d");
    ops = prev;
    return [...p, ...pie].join("\n");
  });
  return ensamblarPdf(flujos, W, H);
}
