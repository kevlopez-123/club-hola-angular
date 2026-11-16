import { ancho, col, envolver, esc, rgb, type Rgb } from "./pdf-base";
import type { DatosCupon } from "./cupon-datos";
import { cargarQr } from "./qr";

/**
 * Cupón en PDF «de verdad» (como un pase de abordar): texto seleccionable, QR dibujado con vectores (nítido al imprimir a cualquier
 * tamaño) y una sola imagen, la cabecera con los logos. Lleva el código, el QR y el documento ofuscado; nunca el documento completo.
 */
const W = 595.28;
const H = 841.89;
const MARGEN = 56;
const CARD_W = 480;
const OSCURO = rgb("#131927");
const MORADO = rgb("#924ff5");
const GRIS = rgb("#6b7280");
const TEXTO = rgb("#141925");
const LILA = rgb("#f1edfe");
const LINEA = rgb("#e5e7eb");
const BLANCO: Rgb = [1, 1, 1];
const NEGRO: Rgb = [0, 0, 0];
const ALTO_CABECERA = 58;

export interface CabeceraJpeg {
  jpeg: Uint8Array;
  /** Tamaño de la imagen en píxeles. */
  w: number;
  h: number;
}
export interface OpcionesCuponPdf {
  /** Dibuja la cabecera (logos sobre fondo oscuro) como JPEG. Si devuelve null, se escribe el nombre del programa. */
  cabecera?: (d: DatosCupon, anchoPt: number, altoPt: number) => Promise<CabeceraJpeg | null>;
}

const cargarImagen = (src: string | undefined) =>
  new Promise<HTMLImageElement | null>((ok) => {
    if (!src) return ok(null);
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

/** Cabecera como JPEG: fondo oscuro con el logo del programa a la izquierda y el del banco a la derecha. */
export async function cabeceraEnNavegador(d: DatosCupon, anchoPt: number, altoPt: number): Promise<CabeceraJpeg | null> {
  const [logo, banco] = await Promise.all([cargarImagen(d.logo), cargarImagen(d.logoBanco)]);
  if (!logo && !banco) return null;
  const k = 4; // píxeles por punto
  const c = document.createElement("canvas");
  c.width = Math.round(anchoPt * k);
  c.height = Math.round(altoPt * k);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#131927";
  ctx.fillRect(0, 0, c.width, c.height);
  const pad = 20 * k;
  const dibujar = (img: HTMLImageElement, altoLogo: number, derecha: boolean) => {
    const h = altoLogo * k;
    const w = (img.width / img.height) * h;
    ctx.drawImage(img, derecha ? c.width - pad - w : pad, (c.height - h) / 2, w, h);
  };
  if (logo) dibujar(logo, 30, false);
  if (banco) dibujar(banco, 24, true);
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.95));
  if (!blob) return null;
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
}

/** Módulos oscuros del QR (true = negro). */
async function matrizQr(texto: string): Promise<{ n: number; oscuro: (fila: number, columna: number) => boolean }> {
  const QR = await cargarQr();
  const modulos = (QR as unknown as { create: (t: string, o: { errorCorrectionLevel: string }) => { modules: { size: number; get: (r: number, c: number) => number } } }).create(texto, { errorCorrectionLevel: "M" }).modules;
  return { n: modulos.size, oscuro: (f, c) => !!modulos.get(f, c) };
}

export async function cuponComoPdf(d: DatosCupon, opciones: OpcionesCuponPdf = {}): Promise<Blob> {
  const x0 = (W - CARD_W) / 2;
  const cx = W / 2;
  const cabecera = await (opciones.cabecera ?? cabeceraEnNavegador)(d, CARD_W, ALTO_CABECERA).catch(() => null);
  const qr = await matrizQr(d.codigo);

  const ops: string[] = [];
  const yp = (yDesdeArriba: number) => H - yDesdeArriba;
  const rg = (c: Rgb) => `${col(c)} rg`;
  const RG = (c: Rgb) => `${col(c)} RG`;
  const rect = (x: number, y: number, w: number, h: number, c: Rgb) => ops.push(`${rg(c)} ${x.toFixed(2)} ${yp(y + h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const pildora = (x: number, y: number, w: number, h: number, c: Rgb) => {
    const r = h / 2;
    const yy = yp(y + h);
    const k = 0.5523 * r;
    ops.push(`${rg(c)} ${(x + r).toFixed(2)} ${yy.toFixed(2)} m ${(x + w - r).toFixed(2)} ${yy.toFixed(2)} l ${(x + w - r + k).toFixed(2)} ${yy.toFixed(2)} ${(x + w).toFixed(2)} ${(yy + r - k).toFixed(2)} ${(x + w).toFixed(2)} ${(yy + r).toFixed(2)} c ${(x + w).toFixed(2)} ${(yy + r + k).toFixed(2)} ${(x + w - r + k).toFixed(2)} ${(yy + h).toFixed(2)} ${(x + w - r).toFixed(2)} ${(yy + h).toFixed(2)} c ${(x + r).toFixed(2)} ${(yy + h).toFixed(2)} l ${(x + r - k).toFixed(2)} ${(yy + h).toFixed(2)} ${x.toFixed(2)} ${(yy + r + k).toFixed(2)} ${x.toFixed(2)} ${(yy + r).toFixed(2)} c ${x.toFixed(2)} ${(yy + r - k).toFixed(2)} ${(x + r - k).toFixed(2)} ${yy.toFixed(2)} ${(x + r).toFixed(2)} ${yy.toFixed(2)} c f`);
  };
  const texto = (t: string, x: number, yBase: number, tam: number, negrita: boolean, c: Rgb, alinear: "izq" | "centro" = "izq") => {
    const px = alinear === "centro" ? x - ancho(t, tam, negrita) / 2 : x;
    ops.push(`BT ${rg(c)} /${negrita ? "F2" : "F1"} ${tam} Tf ${px.toFixed(2)} ${yp(yBase).toFixed(2)} Td (${esc(t)}) Tj ET`);
  };

  let y = MARGEN;
  // Cabecera
  if (cabecera) ops.push(`q ${CARD_W} 0 0 ${ALTO_CABECERA} ${x0.toFixed(2)} ${yp(y + ALTO_CABECERA).toFixed(2)} cm /Im0 Do Q`);
  else {
    rect(x0, y, CARD_W, ALTO_CABECERA, OSCURO);
    texto(d.programa, x0 + 20, y + 36, 18, true, BLANCO);
    const b = d.banco;
    texto(b, x0 + CARD_W - 20 - ancho(b, 12, true), y + 34, 12, true, BLANCO);
  }
  y += ALTO_CABECERA + 30;

  // Comercio, beneficio y descuento
  texto(d.comercio.toUpperCase(), cx, y, 9, true, GRIS, "centro");
  y += 22;
  for (const l of envolver(d.beneficio, CARD_W - 60, 16, 3, true)) { texto(l, cx, y, 16, true, TEXTO, "centro"); y += 20; }
  if (d.descuento) {
    const w = ancho(d.descuento, 11, true) + 28;
    pildora(cx - w / 2, y - 6, w, 20, MORADO);
    texto(d.descuento, cx, y + 8, 11, true, BLANCO, "centro");
    y += 30;
  }

  // QR en vectores (con margen blanco alrededor)
  y += 8;
  const lado = 170;
  const celda = lado / qr.n;
  rect(cx - lado / 2 - 8, y - 8, lado + 16, lado + 16, BLANCO);
  ops.push(`${rg(NEGRO)}`);
  for (let f = 0; f < qr.n; f++) for (let c = 0; c < qr.n; c++) {
    if (qr.oscuro(f, c)) ops.push(`${(cx - lado / 2 + c * celda).toFixed(2)} ${yp(y + (f + 1) * celda).toFixed(2)} ${(celda + 0.15).toFixed(2)} ${(celda + 0.15).toFixed(2)} re f`);
  }
  y += lado + 34;

  // Código y documento ofuscado
  texto(d.codigo, cx, y, 22, true, TEXTO, "centro");
  y += 26;
  texto(`${d.documentoEtiqueta} ${d.documento}`, cx, y, 16, true, TEXTO, "centro");
  y += 22;

  // Aviso
  const aviso = envolver("Cupón personal: solo lo puede usar su titular. El comercio puede pedirte tu documento para comprobarlo.", CARD_W - 80, 9, 3);
  const altoAviso = aviso.length * 12 + 14;
  rect(x0 + 20, y - 10, CARD_W - 40, altoAviso, LILA);
  aviso.forEach((l, i) => texto(l, cx, y + 4 + i * 12, 9, false, rgb("#4b5563"), "centro"));
  y += altoAviso + 14;

  texto(`Válido hasta el ${d.venceEl}`, cx, y, 11, true, TEXTO, "centro");
  y += 16;
  if (d.vigenciaHasta) { texto(`Promoción vigente hasta el ${d.vigenciaHasta}`, cx, y, 9, false, GRIS, "centro"); y += 14; }

  // Locales
  const locales = d.locales.slice(0, 6);
  if (locales.length) {
    y += 6;
    rect(x0 + 20, y, CARD_W - 40, 0.8, LINEA);
    y += 16;
    texto("DÓNDE CANJEARLO", x0 + 20, y, 8, true, GRIS);
    y += 14;
    for (const l of locales) {
      const lineas = envolver(`${l.nombre} - ${l.direccion}, ${l.distrito}${l.horario ? " - " + l.horario : ""}`, CARD_W - 56, 9, 2);
      lineas.forEach((t, i) => texto((i === 0 ? "- " : "  ") + t, x0 + 24, y + i * 11.5, 9, false, TEXTO));
      y += lineas.length * 11.5 + 3;
    }
  }
  // Términos
  if (d.terminos) {
    y += 6;
    rect(x0 + 20, y, CARD_W - 40, 0.8, LINEA);
    y += 16;
    texto("TÉRMINOS Y CONDICIONES", x0 + 20, y, 8, true, GRIS);
    y += 12;
    for (const t of envolver(d.terminos, CARD_W - 44, 7.5, 9)) { texto(t, x0 + 20, y, 7.5, false, GRIS); y += 10; }
  }
  y += 16;
  // Borde del cupón (se dibuja al final, ya con su alto)
  ops.push(`${RG(MORADO)} 1.5 w ${x0.toFixed(2)} ${yp(y).toFixed(2)} ${CARD_W} ${(y - MARGEN).toFixed(2)} re S`);
  texto(`Presenta este cupón junto con tu documento de identidad. Generado desde ${d.programa}.`, cx, y + 22, 8, false, GRIS, "centro");

  return ensamblar(ops.join("\n"), cabecera, `Cupón ${d.codigo} - ${d.beneficio}`);
}

const enc = new TextEncoder();

function ensamblar(contenido: string, cabecera: CabeceraJpeg | null, titulo: string): Blob {
  const trozos: Uint8Array[] = [];
  const offsets: number[] = [];
  let largo = 0;
  const poner = (d: string | Uint8Array) => {
    const b = typeof d === "string" ? enc.encode(d) : d;
    trozos.push(b);
    largo += b.length;
  };
  const objeto = (n: number, partes: (string | Uint8Array)[]) => {
    offsets[n] = largo;
    poner(`${n} 0 obj\n`);
    partes.forEach(poner);
    poner("\nendobj\n");
  };
  // El contenido está en Latin-1 con escapes: cada carácter es un byte.
  const contenidoBytes = new Uint8Array(contenido.length);
  for (let i = 0; i < contenido.length; i++) contenidoBytes[i] = contenido.charCodeAt(i) & 255;
  const tituloSeguro = titulo.replace(/[()\\\r\n]/g, " ").replace(/[^\x20-\x7e]/g, "");

  poner("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  objeto(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  objeto(2, ["<< /Type /Pages /Kids [5 0 R] /Count 1 >>"]);
  objeto(3, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]);
  objeto(4, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]);
  objeto(5, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 6 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${cabecera ? " /XObject << /Im0 7 0 R >>" : ""} >> >>`]);
  objeto(6, [`<< /Length ${contenidoBytes.length} >>\nstream\n`, contenidoBytes, "\nendstream"]);
  if (cabecera) {
    objeto(7, [`<< /Type /XObject /Subtype /Image /Width ${cabecera.w} /Height ${cabecera.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${cabecera.jpeg.length} >>\nstream\n`, cabecera.jpeg, "\nendstream"]);
  }
  objeto(8, [`<< /Title (${tituloSeguro}) /Producer (Club Hola) >>`]);

  const inicioXref = largo;
  const ids = cabecera ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 8];
  let xref = `xref\n0 9\n0000000000 65535 f \n`;
  for (let i = 1; i <= 8; i++) xref += i === 7 && !cabecera ? `0000000000 65535 f \n` : `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  void ids;
  poner(xref);
  poner(`trailer\n<< /Size 9 /Root 1 0 R /Info 8 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
  const salida = new Uint8Array(largo);
  let p = 0;
  for (const t of trozos) { salida.set(t, p); p += t.length; }
  return new Blob([salida], { type: "application/pdf" });
}
