/**
 * Cupón listo para imprimir o guardar como PDF. Lleva lo que el comercio necesita para validarlo: el código, el QR y el documento
 * del titular ofuscado (solo los 4 últimos caracteres), que se cruza con el documento físico de quien lo presenta.
 */
export interface DatosCuponImpreso {
  programa: string;
  banco: string;
  logo?: string | undefined;
  beneficio: string;
  comercio: string;
  descuento: string;
  codigo: string;
  /** Imagen del QR (data URL). Si falta, el cupón sale solo con el código. */
  qr?: string | undefined;
  /** Etiqueta y valor del documento: «DNI» y «****4567». */
  documentoEtiqueta: string;
  documento: string;
  /** Fecha y hora hasta la que se puede usar el cupón. */
  venceEl: string;
  /** Hasta cuándo es válida la promoción (opcional). */
  vigenciaHasta?: string | undefined;
  locales: { nombre: string; direccion: string; distrito: string; horario?: string | undefined }[];
  terminos?: string | undefined;
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Solo imágenes en línea o del propio sitio: nunca un esquema que ejecute código. */
const imgSegura = (u: string | undefined) => (u && /^(data:image\/(png|jpeg|svg\+xml);|https?:\/\/|\/|[\w./-]+$)/i.test(u) ? u : "");

export function htmlCuponImpreso(d: DatosCuponImpreso): string {
  const logo = imgSegura(d.logo);
  const qr = imgSegura(d.qr);
  const locales = d.locales.slice(0, 6);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cupón ${esc(d.codigo)} · ${esc(d.beneficio)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 Arial, Helvetica, sans-serif; color: #141925; }
  .cupon { max-width: 520px; margin: 0 auto; border: 2px solid #924ff5; border-radius: 16px; overflow: hidden; }
  .cab { background: #131927; color: #fff; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cab img { height: 30px; } .cab b { font-size: 18px; }
  .cuerpo { padding: 20px; text-align: center; }
  .marca { text-transform: uppercase; letter-spacing: .06em; font-size: 12px; color: #6b7280; margin: 0; }
  h1 { font-size: 20px; margin: 6px 0; } .desc { display: inline-block; background: #924ff5; color: #fff; border-radius: 999px; padding: 2px 14px; font-weight: 700; }
  .qr { margin: 16px auto 4px; display: block; width: 200px; height: 200px; }
  .codigo { font-size: 24px; font-weight: 800; letter-spacing: .04em; margin: 4px 0; }
  .dni { font-size: 18px; font-weight: 700; letter-spacing: .06em; margin: 2px 0 8px; }
  .aviso { background: #f1edfe; border-radius: 10px; padding: 8px 12px; font-size: 12px; color: #4b5563; margin: 10px 0; }
  .vence { font-weight: 700; } .sec { text-align: left; border-top: 1px solid #e5e7eb; margin-top: 14px; padding-top: 10px; font-size: 12px; }
  .sec h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin: 0 0 6px; }
  .sec ul { margin: 0; padding-left: 16px; } .pie { font-size: 11px; color: #6b7280; text-align: center; margin-top: 12px; }
</style></head><body>
<div class="cupon">
  <div class="cab">${logo ? `<img src="${esc(logo)}" alt="${esc(d.programa)}">` : `<b>${esc(d.programa)}</b>`}<span>${esc(d.banco)}</span></div>
  <div class="cuerpo">
    <p class="marca">${esc(d.comercio)}</p>
    <h1>${esc(d.beneficio)}</h1>
    ${d.descuento ? `<span class="desc">${esc(d.descuento)}</span>` : ""}
    ${qr ? `<img class="qr" src="${esc(qr)}" alt="Código QR del cupón">` : ""}
    <p class="codigo">${esc(d.codigo)}</p>
    <p class="dni">${esc(d.documentoEtiqueta)} ${esc(d.documento)}</p>
    <p class="aviso">Cupón personal: solo lo puede usar su titular. El comercio puede pedirte tu documento para comprobarlo.</p>
    <p class="vence">Válido hasta el ${esc(d.venceEl)}</p>
    ${d.vigenciaHasta ? `<p>Promoción vigente hasta el ${esc(d.vigenciaHasta)}</p>` : ""}
    ${locales.length ? `<div class="sec"><h2>Dónde canjearlo</h2><ul>${locales.map((l) => `<li><b>${esc(l.nombre)}</b> · ${esc(l.direccion)}, ${esc(l.distrito)}${l.horario ? ` · ${esc(l.horario)}` : ""}</li>`).join("")}</ul></div>` : ""}
    ${d.terminos ? `<div class="sec"><h2>Términos y condiciones</h2><p>${esc(d.terminos.length > 600 ? d.terminos.slice(0, 597) + "…" : d.terminos)}</p></div>` : ""}
  </div>
</div>
<p class="pie">Presenta este cupón junto con tu documento de identidad. Generado desde ${esc(d.programa)}.</p>
</body></html>`;
}

/** Abre el cuadro de impresión con el documento (sin ventanas emergentes: usa un marco oculto). Desde ahí también se guarda como PDF. */
export function imprimirDocumento(html: string, doc: Document = document): void {
  const marco = doc.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  doc.body.appendChild(marco);
  const w = marco.contentWindow;
  if (!w) { marco.remove(); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  const lanzar = () => { w.focus(); w.print(); setTimeout(() => marco.remove(), 60000); };
  // Se espera a que carguen el logo y el QR antes de abrir el cuadro de impresión.
  const imgs = Array.from(w.document.images);
  const pendientes = imgs.filter((i) => !i.complete);
  if (!pendientes.length) { setTimeout(lanzar, 50); return; }
  let faltan = pendientes.length;
  const fin = () => { if (--faltan <= 0) lanzar(); };
  pendientes.forEach((i) => { i.addEventListener("load", fin); i.addEventListener("error", fin); });
  setTimeout(() => { if (faltan > 0) { faltan = 0; lanzar(); } }, 3000);
}
