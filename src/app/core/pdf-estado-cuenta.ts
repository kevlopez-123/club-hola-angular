/**
 * Estado de cuenta de puntos en PDF con formato: encabezado con el color de la marca, resumen del periodo y tabla paginada
 * (fecha, detalle, tipo y puntos). Se arma sin librerías, con las fuentes estándar Helvetica del PDF.
 * Con un servidor real, este documento lo genera el backend con los datos oficiales.
 */
import { ancho, col, ensamblarPdf, envolver, esc, rgb, type Rgb } from "./pdf-base";

export interface FilaEstado {
  fecha: string;
  detalle: string;
  tipo: string;
  puntos: number;
}
export interface DatosEstado {
  programa: string;
  participante: string;
  periodo: string;
  generado: string;
  /** Color de la marca (#rrggbb). */
  color: string;
  saldo: string;
  ganados: string;
  usados: string;
  filas: FilaEstado[];
  formatoPuntos: (n: number) => string;
}

const W = 595;
const H = 842;
const M = 40;

export function pdfEstadoCuenta(d: DatosEstado): Blob {
  const primario = rgb(d.color);
  const gris: Rgb = [0.45, 0.47, 0.5];
  const texto: Rgb = [0.1, 0.12, 0.15];
  const paginas: string[][] = [];
  let ops: string[] = [];
  let y = 0;

  const rect = (x: number, yy: number, w: number, h: number, c: Rgb) => ops.push(`${col(c)} rg`, `${x} ${yy} ${w} ${h} re f`);
  const txt = (s: string, x: number, yy: number, tam: number, c: Rgb, negrita = false, alinear: "i" | "d" = "i") => {
    const px = alinear === "d" ? x - ancho(s, tam, negrita) : x;
    ops.push("BT", `${col(c)} rg`, `/${negrita ? "F2" : "F1"} ${tam} Tf`, `${px.toFixed(2)} ${yy.toFixed(2)} Td`, `(${esc(s)}) Tj`, "ET");
  };
  const linea = (yy: number) => ops.push("0.88 0.89 0.91 RG", "0.5 w", `${M} ${yy} m ${W - M} ${yy} l S`);

  const COLS = { fecha: M + 8, detalle: M + 86, tipo: M + 350, puntos: W - M - 8 };
  const cabeceraTabla = () => {
    rect(M, y - 22, W - 2 * M, 22, [0.95, 0.96, 0.97]);
    txt("Fecha", COLS.fecha, y - 15, 9, gris, true);
    txt("Detalle", COLS.detalle, y - 15, 9, gris, true);
    txt("Tipo", COLS.tipo, y - 15, 9, gris, true);
    txt("Puntos", COLS.puntos, y - 15, 9, gris, true, "d");
    y -= 22;
  };
  const nuevaPagina = (primera: boolean) => {
    if (ops.length) paginas.push(ops);
    ops = [];
    if (primera) {
      rect(0, H - 96, W, 96, primario);
      txt(d.programa, M, H - 42, 11, [1, 1, 1]);
      txt("Estado de cuenta de puntos", M, H - 70, 22, [1, 1, 1], true);
      y = H - 96 - 28;
      txt(d.participante, M, y, 13, texto, true);
      txt(`Periodo: ${d.periodo}`, M, y - 17, 10, gris);
      txt(`Generado el ${d.generado}`, W - M, y - 17, 10, gris, false, "d");
      y -= 44;
      // Resumen en tres cajas
      const caja = (i: number, etiqueta: string, valor: string, c: Rgb) => {
        const w = (W - 2 * M - 24) / 3;
        const x = M + i * (w + 12);
        rect(x, y - 54, w, 54, [0.95, 0.96, 0.97]);
        rect(x, y - 54, 3, 54, primario);
        txt(etiqueta, x + 14, y - 20, 9, gris);
        txt(valor, x + 14, y - 42, 17, c, true);
      };
      caja(0, "Saldo actual", d.saldo, texto);
      caja(1, "Ganados en el periodo", `+${d.ganados}`, primario);
      caja(2, "Usados en el periodo", d.usados, texto);
      y -= 54 + 24;
      txt(`Movimientos (${d.filas.length})`, M, y, 12, texto, true);
      y -= 12;
    } else {
      rect(0, H - 8, W, 8, primario);
      y = H - 40;
      txt(`Estado de cuenta de puntos - ${d.participante}`, M, y, 9, gris);
      y -= 14;
    }
    cabeceraTabla();
  };

  nuevaPagina(true);
  const tam = 9.5;
  d.filas.forEach((f, i) => {
    const lineasDetalle = envolver(f.detalle, COLS.tipo - COLS.detalle - 12, tam, 2);
    const alto = lineasDetalle.length > 1 ? 32 : 22;
    if (y - alto < 62) nuevaPagina(false);
    if (i % 2 === 1) rect(M, y - alto, W - 2 * M, alto, [0.985, 0.987, 0.99]);
    const base = y - (alto > 22 ? 14 : 15);
    txt(f.fecha, COLS.fecha, base, tam, gris);
    lineasDetalle.forEach((l, k) => txt(l, COLS.detalle, base - k * 11, tam, texto, true));
    txt(f.tipo, COLS.tipo, base, tam, gris);
    txt(`${f.puntos > 0 ? "+" : ""}${d.formatoPuntos(f.puntos)}`, COLS.puntos, base, tam, f.puntos > 0 ? primario : texto, true, "d");
    y -= alto;
    linea(y);
  });
  if (!d.filas.length) {
    txt("No hay movimientos en el periodo seleccionado.", M + 8, y - 20, 10, gris);
  }
  paginas.push(ops);

  // Pie de página con numeración
  const total = paginas.length;
  const flujos = paginas.map((p, i) => {
    const pie: string[] = [];
    const prev = ops;
    ops = pie;
    linea(46);
    txt(`${d.programa} - Documento informativo generado desde tu cuenta.`, M, 32, 8, gris);
    txt(`Página ${i + 1} de ${total}`, W - M, 32, 8, gris, false, "d");
    ops = prev;
    return [...p, ...pie].join("\n");
  });

  return ensamblarPdf(flujos, W, H);
}
