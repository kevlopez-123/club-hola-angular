/**
 * PDF de una sola página con una imagen JPEG (sin librerías). El JPEG se incrusta tal cual (filtro DCTDecode).
 * La imagen se centra arriba y se ajusta al ancho de la página A4 dejando `margen` puntos a cada lado.
 */
const enc = new TextEncoder();

export function pdfDeJpeg(jpeg: Uint8Array, ancho: number, alto: number, titulo: string, margen = 56): Blob {
  const W = 595.28;
  const H = 841.89;
  let w = W - margen * 2;
  let h = (alto / ancho) * w;
  // Si es muy alta, se ajusta al alto disponible.
  if (h > H - margen * 2) { h = H - margen * 2; w = (ancho / alto) * h; }
  const x = (W - w) / 2;
  const y = H - margen - h;

  const trozos: Uint8Array[] = [];
  const offsets: number[] = [];
  let largo = 0;
  const poner = (d: string | Uint8Array) => {
    const b = typeof d === "string" ? enc.encode(d) : d;
    trozos.push(b);
    largo += b.length;
  };
  const objeto = (n: number, cuerpo: string | Uint8Array[]) => {
    offsets[n] = largo;
    poner(`${n} 0 obj\n`);
    if (typeof cuerpo === "string") poner(cuerpo);
    else cuerpo.forEach((c) => poner(c));
    poner("\nendobj\n");
  };
  const tituloSeguro = titulo.replace(/[()\\\r\n]/g, " ").replace(/[^\x20-\x7e]/g, "");

  poner("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objeto(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  objeto(4, [
    enc.encode(`<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    enc.encode("\nendstream"),
  ]);
  const contenido = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
  objeto(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  objeto(6, `<< /Title (${tituloSeguro}) /Producer (Club Hola) >>`);

  const inicioXref = largo;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  poner(xref);
  poner(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);

  const salida = new Uint8Array(largo);
  let p = 0;
  for (const t of trozos) { salida.set(t, p); p += t.length; }
  return new Blob([salida], { type: "application/pdf" });
}
