import type { DatosCupon } from "./cupon-datos";
import { pdfDeJpeg } from "./pdf-imagen";

const FUENTE = "Manrope, Arial, Helvetica, sans-serif";
const MORADO = "#924ff5";
const OSCURO = "#131927";
const ANCHO = 900;

/** Divide un texto en líneas que caben en `max` píxeles (con la fuente ya puesta en el contexto). */
export function partirLineas(ctx: Pick<CanvasRenderingContext2D, "measureText">, texto: string, max: number, maxLineas = 4): string[] {
  const salida: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= max || !actual) actual = prueba;
    else { salida.push(actual); actual = palabra; }
  }
  if (actual) salida.push(actual);
  if (salida.length > maxLineas) {
    const resto = salida.slice(0, maxLineas);
    resto[maxLineas - 1] = resto[maxLineas - 1]!.replace(/\s*\S*$/, "") + "…";
    return resto;
  }
  return salida;
}

const cargar = (src: string | undefined) =>
  new Promise<HTMLImageElement | null>((ok) => {
    if (!src) return ok(null);
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

function redondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dibuja el cupón (código, QR y documento ofuscado; nunca el documento completo). */
async function dibujarCupon(d: DatosCupon): Promise<HTMLCanvasElement> {
  const [logo, qr, logoBanco] = await Promise.all([cargar(d.logo), cargar(d.qr), cargar(d.logoBanco)]);
  const medida = document.createElement("canvas").getContext("2d")!;
  const margen = 60;
  const util = ANCHO - margen * 2;

  // Primero se calcula el alto con las líneas que ocupa cada texto.
  medida.font = `800 40px ${FUENTE}`;
  const titulo = partirLineas(medida, d.beneficio, util, 3);
  medida.font = `500 24px ${FUENTE}`;
  const locales = d.locales.slice(0, 3).map((l) => partirLineas(medida, `${l.nombre} · ${l.direccion}, ${l.distrito}`, util, 2));
  const nLocales = locales.reduce((s, l) => s + l.length, 0);
  const alto = 150 + 40 + titulo.length * 50 + 70 + (qr ? 380 : 0) + 130 + 80 + 90 + 60 + (nLocales ? 56 + nLocales * 34 : 0) + 40;

  const c = document.createElement("canvas");
  c.width = ANCHO;
  c.height = alto;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ANCHO, alto);

  // Cabecera
  ctx.fillStyle = OSCURO;
  ctx.fillRect(0, 0, ANCHO, 110);
  if (logo) {
    const h = 54;
    ctx.drawImage(logo, margen, 28, (logo.width / logo.height) * h, h);
  } else {
    ctx.fillStyle = "#fff";
    ctx.font = `800 40px ${FUENTE}`;
    ctx.textAlign = "left";
    ctx.fillText(d.programa, margen, 70);
  }
  if (logoBanco) {
    const h = 44;
    const w = (logoBanco.width / logoBanco.height) * h;
    ctx.drawImage(logoBanco, ANCHO - margen - w, 33, w, h);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 26px ${FUENTE}`;
    ctx.textAlign = "right";
    ctx.fillText(d.banco, ANCHO - margen, 66);
  }

  // Cuerpo
  ctx.textAlign = "center";
  const cx = ANCHO / 2;
  let y = 170;
  ctx.fillStyle = "#6b7280";
  ctx.font = `700 24px ${FUENTE}`;
  ctx.fillText(d.comercio.toUpperCase(), cx, y);
  y += 56;
  ctx.fillStyle = OSCURO;
  ctx.font = `800 40px ${FUENTE}`;
  for (const l of titulo) { ctx.fillText(l, cx, y); y += 50; }
  if (d.descuento) {
    ctx.font = `800 28px ${FUENTE}`;
    const w = ctx.measureText(d.descuento).width + 56;
    ctx.fillStyle = MORADO;
    redondo(ctx, cx - w / 2, y - 6, w, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(d.descuento, cx, y + 32);
    y += 70;
  }
  if (qr) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, cx - 170, y, 340, 340);
    y += 380;
  }
  ctx.fillStyle = OSCURO;
  ctx.font = `800 52px ${FUENTE}`;
  ctx.fillText(d.codigo, cx, y + 20);
  y += 84;
  ctx.font = `800 38px ${FUENTE}`;
  ctx.fillText(`${d.documentoEtiqueta} ${d.documento}`, cx, y);
  y += 50;
  // Aviso
  ctx.fillStyle = "#f1edfe";
  redondo(ctx, margen, y - 28, util, 62, 14);
  ctx.fill();
  ctx.fillStyle = "#4b5563";
  ctx.font = `500 21px ${FUENTE}`;
  ctx.fillText("Cupón personal: solo lo puede usar su titular. Lleva tu documento.", cx, y + 10);
  y += 86;
  ctx.fillStyle = OSCURO;
  ctx.font = `700 26px ${FUENTE}`;
  ctx.fillText(`Válido hasta el ${d.venceEl}`, cx, y);
  y += 56;

  if (nLocales) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(margen, y - 26, util, 2);
    ctx.fillStyle = "#6b7280";
    ctx.font = `700 20px ${FUENTE}`;
    ctx.fillText("DÓNDE CANJEARLO", margen, y + 8);
    y += 44;
    ctx.fillStyle = OSCURO;
    ctx.font = `500 24px ${FUENTE}`;
    for (const grupo of locales) for (const l of grupo) { ctx.fillText(l, margen, y); y += 34; }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 20px ${FUENTE}`;
  ctx.fillText(`Generado desde ${d.programa}`, cx, alto - 36);

  // Borde del cupón
  ctx.strokeStyle = MORADO;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, ANCHO - 6, alto - 6);

  return c;
}

const aBlob = (c: HTMLCanvasElement, tipo: string, calidad?: number) =>
  new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error(tipo))), tipo, calidad));

/** El cupón como imagen PNG (para guardarla en el celular o compartirla con el comercio). */
export async function cuponComoPng(d: DatosCupon): Promise<Blob> {
  return aBlob(await dibujarCupon(d), "image/png");
}

/** El cupón como PDF de una página (A4), listo para descargar con un nombre de archivo propio. */
export async function cuponComoPdf(d: DatosCupon): Promise<Blob> {
  const c = await dibujarCupon(d);
  const jpeg = new Uint8Array(await (await aBlob(c, "image/jpeg", 0.95)).arrayBuffer());
  return pdfDeJpeg(jpeg, c.width, c.height, `Cupón ${d.codigo} - ${d.beneficio}`);
}
